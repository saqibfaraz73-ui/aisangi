import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSettings(supabase: any) {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key && data?.provider === "gemini") {
    return {
      apiKey: data.api_key,
      musicModel: data.music_model || "lyria-002",
    };
  }

  throw new Error(
    "Music generation requires a custom Gemini API key with Lyria enabled. Configure in Admin → Custom AI API settings."
  );
}

async function callWithRetry(url: string, body: any, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 500 && attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 8000)));
      continue;
    }
    if (response.status === 429 && attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, Math.min(2000 * Math.pow(2, attempt), 16000)));
      continue;
    }
    return response;
  }
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, negative_prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a prompt for music generation." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { apiKey, musicModel } = await getSettings(supabase);

    console.log(`Generating music with model: ${musicModel}, prompt length: ${prompt.length}`);

    // Use generateContent endpoint with audio response modality
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${musicModel}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [{ parts: [{ text: prompt.trim() }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
      },
    };

    // Add negative prompt if provided
    if (negative_prompt?.trim()) {
      requestBody.contents[0].parts.push({ text: `Negative prompt: ${negative_prompt.trim()}` });
    }

    const response = await callWithRetry(url, requestBody);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Music generation error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API key or Lyria not enabled. Check Admin settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let errorMsg = "Music generation failed. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed?.error?.message || errorMsg;
      } catch {}

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;

    if (!Array.isArray(parts)) {
      throw new Error("No audio data in response");
    }

    let audioData: string | null = null;
    let mimeType = "audio/wav";

    for (const part of parts) {
      if (part.inlineData?.data) {
        audioData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType;
      }
      if (part.inline_data?.data) {
        audioData = part.inline_data.data;
        mimeType = part.inline_data.mime_type || mimeType;
      }
    }

    if (!audioData) {
      throw new Error("No audio generated. Try a different prompt.");
    }

    const tokensUsed = data?.usageMetadata?.totalTokenCount || 0;

    return new Response(
      JSON.stringify({
        audioContent: audioData,
        mimeType,
        tokensUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-music error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
