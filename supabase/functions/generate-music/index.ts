import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildVertexUrl, hasServiceAccount } from "../_shared/vertex-auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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
      useVertexAI: hasServiceAccount(),
    };
  }

  // Fallback to Vertex AI if service account is available
  if (hasServiceAccount()) {
    return {
      apiKey: "",
      musicModel: data?.music_model || "lyria-002",
      useVertexAI: true,
    };
  }

  throw new Error(
    "Music generation requires a custom Gemini API key or a GCP service account. Configure in Admin → Custom AI API settings."
  );
}

async function callWithRetry(
  url: string,
  headers: Record<string, string>,
  body: any,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
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
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
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

    const { apiKey, musicModel, useVertexAI } = await getSettings(supabase);

    let url: string;
    let authHeaders: Record<string, string> = {};
    let requestBody: any;

    if (useVertexAI) {
      // Lyria uses the "predict" endpoint on Vertex AI
      url = buildVertexUrl(musicModel, "predict");
      const token = await getAccessToken();
      authHeaders = { Authorization: `Bearer ${token}` };

      console.log(`Music gen using Vertex AI model: ${musicModel}`);

      // Vertex AI Lyria predict format
      const instance: any = { prompt: prompt.trim() };
      if (negative_prompt?.trim()) {
        instance.negative_prompt = negative_prompt.trim();
      }

      requestBody = {
        instances: [instance],
        parameters: {
          sample_count: 1,
        },
      };
    } else {
      // AI Studio / generativelanguage.googleapis.com format
      url = `https://generativelanguage.googleapis.com/v1beta/models/${musicModel}:generateContent?key=${apiKey}`;

      console.log(`Music gen using AI Studio model: ${musicModel}`);

      requestBody = {
        contents: [{ parts: [{ text: prompt.trim() }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
      };

      if (negative_prompt?.trim()) {
        requestBody.contents[0].parts.push({ text: `Negative prompt: ${negative_prompt.trim()}` });
      }
    }

    const response = await callWithRetry(url, authHeaders, requestBody);

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
          JSON.stringify({ error: "Invalid API credentials or Lyria not enabled. Check Admin settings." }),
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

    let audioData: string | null = null;
    let mimeType = "audio/wav";

    if (useVertexAI) {
      // Vertex AI Lyria predict response format
      const predictions = data?.predictions;
      if (Array.isArray(predictions) && predictions.length > 0) {
        audioData = predictions[0].bytesBase64Encoded;
        mimeType = predictions[0].mimeType || "audio/wav";
      }
    } else {
      // Standard Gemini generateContent response
      const parts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
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
