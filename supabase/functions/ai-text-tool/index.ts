import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const allowed = await checkRateLimit();
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, text, tone, length } = await req.json();
    if (!action || !text) return new Response(JSON.stringify({ error: "Missing action or text" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Auth
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get API settings
    const { data: apiSettings } = await supabase.from("api_settings").select("*").limit(1).maybeSingle();

    let prompt = "";
    if (action === "paraphrase") {
      prompt = `Paraphrase the following text in a ${tone || "standard"} tone. Keep the meaning but change the wording significantly. Return only the paraphrased text, no explanations:\n\n${text}`;
    } else if (action === "summarize") {
      const lengthInstr = length === "brief" ? "in 1-2 sentences" : length === "bullet" ? "as bullet points" : length === "detailed" ? "in multiple detailed paragraphs" : "in a concise paragraph";
      prompt = `Summarize the following text ${lengthInstr}. Return only the summary:\n\n${text}`;
    } else if (action === "presentation") {
      prompt = `Create a presentation about: "${text}". Return a JSON array of slide objects with "title" and "content" fields. Include 6-10 slides covering introduction, main points, and conclusion. Return ONLY valid JSON array, no markdown.`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use Vertex AI / Gemini
    const gcpSecret = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
    const model = apiSettings?.script_model || "gemini-2.5-flash-lite";
    let result = "";

    if (gcpSecret) {
      // Try Lovable AI gateway first, or direct Gemini
      let isApiKey = false;
      try { JSON.parse(gcpSecret); } catch { isApiKey = true; }

      if (isApiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gcpSecret}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // Service account flow
        const { getAccessToken } = await import("..//_shared/vertex-auth.ts");
        const accessToken = await getAccessToken(gcpSecret);
        const sa = JSON.parse(gcpSecret);
        const projectId = sa.project_id || "gen-lang-client-0340067478";
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } else {
      // Fallback to Lovable AI
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) return new Response(JSON.stringify({ error: "No AI provider configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const res = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
        body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      result = data?.choices?.[0]?.message?.content || "";
    }

    // Log usage
    if (userId) {
      const section = action === "paraphrase" ? "paraphrase" : action === "summarize" ? "summarizer" : "presentation";
      await supabase.from("usage_log").insert({ user_id: userId, section, tokens_used: 0 });
    }

    // For presentation, parse JSON
    if (action === "presentation") {
      try {
        const clean = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const slides = JSON.parse(clean);
        return new Response(JSON.stringify({ slides }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ slides: [{ title: "Generated Content", content: result }] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
