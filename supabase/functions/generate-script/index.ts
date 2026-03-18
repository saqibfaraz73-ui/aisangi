import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getApiConfig(supabase: any) {
  const { data } = await supabase.from("api_settings").select("*").limit(1).maybeSingle();

  if (data?.enabled && data?.api_key) {
    const provider = data.provider || "gemini";
    const model = data.model || (provider === "openai" ? "gpt-4o" : "gemini-2.0-flash");
    // For script generation with DALL-E selected, fall back to GPT-4o for text
    const textModel = provider === "openai" && model === "dall-e-3" ? "gpt-4o" : model;

    const baseUrl = provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    return { apiKey: data.api_key, model: textModel, baseUrl, provider, useCustom: true };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No API key configured. Set up your API key in Admin settings.");

  return {
    apiKey: lovableKey,
    model: "google/gemini-3-flash-preview",
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    provider: "lovable",
    useCustom: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, sceneCount } = await req.json();

    if (!idea || typeof idea !== "string") {
      return new Response(JSON.stringify({ error: "Please provide a video idea" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiConfig = await getApiConfig(supabase);
    console.log(`Script gen using ${apiConfig.provider} model: ${apiConfig.model}`);

    const count = sceneCount || 3;
    const systemPrompt = `You are an expert viral video scriptwriter. Given a video idea, generate:
1. Scene descriptions (visual prompts for AI image generation) — vivid, detailed, realistic.
2. A voiceover narration script across all scenes.

Respond ONLY with valid JSON:
{
  "title": "Short catchy video title",
  "scenes": [{"sceneNumber": 1, "imagePrompt": "...", "narration": "..."}],
  "fullNarration": "Complete voiceover...",
  "hashtags": ["relevant", "hashtags"]
}

Generate exactly ${count} scenes. Detailed image prompts with lighting, style, colors, mood. Engaging narration for viral short-form content.`;

    const response = await fetch(apiConfig.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Video idea: ${idea}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: `Invalid ${apiConfig.provider} API key. Check Admin settings.` }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add your own API key in Admin." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await response.text();
      console.error("API error:", response.status, errText);
      throw new Error("Script generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-script error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
