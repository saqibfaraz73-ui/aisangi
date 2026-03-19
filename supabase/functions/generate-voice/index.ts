import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getAccessToken, buildVertexUrl, hasServiceAccount } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";

const AVAILABLE_VOICES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Aoede",
  "Leda", "Orus", "Perseus", "Schedar", "Vega",
];

function buildGeminiTtsUrl(apiKey: string, model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function getGeminiSettings(supabase: any): Promise<{ apiKey: string; voiceModel: string; useVertexAI: boolean }> {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key && data?.provider === "gemini") {
    return {
      apiKey: data.api_key,
      voiceModel: data.voice_model || DEFAULT_TTS_MODEL,
      useVertexAI: hasServiceAccount(),
    };
  }

  throw new Error(
    "Text-to-Speech requires a custom Gemini API key. Please configure one in Admin → Custom AI API settings."
  );
}

async function callTtsWithRetry(url: string, headers: Record<string, string>, body: any, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

    if (response.status === 500 && attempt < maxRetries - 1) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.log(`TTS returned 500, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (response.status === 429 && attempt < maxRetries - 1) {
      const waitMs = Math.min(2000 * Math.pow(2, attempt), 16000);
      console.log(`TTS rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitMs));
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
    const { text, voice = "Kore" } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide text to convert to speech." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Text is too long. Maximum 5000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedVoice = AVAILABLE_VOICES.includes(voice) ? voice : "Kore";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { apiKey, voiceModel, useVertexAI } = await getGeminiSettings(supabase);

    let url: string;
    let authHeaders: Record<string, string> = {};

    if (useVertexAI) {
      url = buildVertexUrl(voiceModel);
      const token = await getAccessToken();
      authHeaders = { Authorization: `Bearer ${token}` };
      console.log(`TTS using Vertex AI model: ${voiceModel}, voice: ${selectedVoice}`);
    } else {
      url = buildGeminiTtsUrl(apiKey, voiceModel);
      console.log(`TTS using AI Studio model: ${voiceModel}, voice: ${selectedVoice}`);
    }

    const requestBody = {
      contents: [{ parts: [{ text: text.trim() }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice,
            },
          },
        },
      },
    };

    const response = await callTtsWithRetry(url, authHeaders, requestBody);

    if (!response.ok) {
      const errText = await response.text();
      console.error("TTS error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API credentials. Check Admin settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let errorMsg = "Voice generation failed. Please try again.";
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
    let mimeType = "audio/L16;rate=24000";

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
      throw new Error("No audio generated. Try different text.");
    }

    // Convert raw PCM to WAV for browser playback
    const pcmBytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmBytes.length, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmBytes.length, true);

    const wavBytes = new Uint8Array(44 + pcmBytes.length);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    wavBytes.set(pcmBytes, 44);

    const wavBase64 = base64Encode(wavBytes);
    const tokensUsed = data?.usageMetadata?.totalTokenCount || 0;

    return new Response(
      JSON.stringify({
        audioContent: wavBase64,
        mimeType: "audio/wav",
        voice: selectedVoice,
        tokensUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-voice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
