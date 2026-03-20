import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getAccessToken, buildVertexUrl, hasServiceAccount, getGeminiApiKeyFromEnv } from "../_shared/vertex-auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MUSIC_MODEL = "lyria-002";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Kore";
const VOCAL_TRIGGER_PATTERN = /\b(sing|sings|singing|singer|vocal|vocals|lyric|lyrics|speak|speaks|speaking|spoken|voice|say|says|saying|meow|miaow|woof|bark)\b/i;
const VOCAL_BLOCK_PATTERN = /\b(no vocals|instrumental only|without vocals|no singing|no lyrics|no voice|mute vocals)\b/i;

function buildGeminiAudioUrl(apiKey: string, model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function getSettings(supabase: any) {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key && data?.provider === "gemini") {
    return {
      apiKey: data.api_key,
      musicModel: data.music_model || DEFAULT_MUSIC_MODEL,
      voiceModel: data.voice_model || DEFAULT_TTS_MODEL,
      useVertexAI: hasServiceAccount(),
    };
  }

  if (hasServiceAccount()) {
    return {
      apiKey: "",
      musicModel: data?.music_model || DEFAULT_MUSIC_MODEL,
      voiceModel: data?.voice_model || DEFAULT_TTS_MODEL,
      useVertexAI: true,
    };
  }

  const envApiKey = getGeminiApiKeyFromEnv();
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      musicModel: data?.music_model || DEFAULT_MUSIC_MODEL,
      voiceModel: data?.voice_model || DEFAULT_TTS_MODEL,
      useVertexAI: false,
    };
  }

  throw new Error(
    "Music generation requires a custom Gemini API key or a GCP service account. Configure in Admin → Custom AI API settings."
  );
}

function promptRequestsVocals(prompt: string, negativePrompt?: string) {
  if (negativePrompt && VOCAL_BLOCK_PATTERN.test(negativePrompt)) {
    return false;
  }

  return VOCAL_TRIGGER_PATTERN.test(prompt);
}

function extractVocalText(prompt: string) {
  const quoted = prompt.match(/["“']([^"”']+)["”']/)?.[1]?.trim();
  if (quoted) return quoted;

  const trailingPhrase = prompt.match(/\b(?:sing|sings|singing|say|says|saying|lyrics?)\b[:\s-]*(.+)$/i)?.[1]?.trim();
  if (trailingPhrase) {
    return trailingPhrase
      .replace(/^(like|with|about|of)\s+/i, "")
      .replace(/[.,!?]+$/g, "")
      .trim();
  }

  const repeatedSound = prompt.match(/\b(?:meow|miaow|woof|bark|la|na)(?:\s+(?:meow|miaow|woof|bark|la|na))+\b/i)?.[0]?.trim();
  if (repeatedSound) return repeatedSound;

  return prompt.trim();
}

function pcmBase64ToWavBase64(audioData: string) {
  const pcmBytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmBytes.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmBytes.length, true);

  const wavBytes = new Uint8Array(44 + pcmBytes.length);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(pcmBytes, 44);

  return base64Encode(wavBytes);
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
    const allowed = await checkRateLimit();
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { apiKey, musicModel, voiceModel, useVertexAI } = await getSettings(supabase);
    const wantsVocals = promptRequestsVocals(prompt.trim(), negative_prompt);

    let url: string;
    let authHeaders: Record<string, string> = {};
    let requestBody: any;
    let responseMode: "instrumental" | "vocal" = wantsVocals ? "vocal" : "instrumental";

    if (responseMode === "vocal") {
      const vocalText = extractVocalText(prompt.trim());
      const targetModel = voiceModel || DEFAULT_TTS_MODEL;

      if (useVertexAI) {
        url = buildVertexUrl(targetModel);
        const token = await getAccessToken();
        authHeaders = { Authorization: `Bearer ${token}` };
      } else {
        url = buildGeminiAudioUrl(apiKey, targetModel);
      }

      console.log(`Music gen routed to vocal model: ${targetModel}; text="${vocalText}"`);

      requestBody = {
        contents: [{ role: "user", parts: [{ text: vocalText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: DEFAULT_VOICE,
              },
            },
          },
        },
      };
    } else if (useVertexAI) {
      url = buildVertexUrl(musicModel, "predict");
      const token = await getAccessToken();
      authHeaders = { Authorization: `Bearer ${token}` };

      console.log(`Music gen using Vertex AI instrumental model: ${musicModel}`);

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
      url = buildGeminiAudioUrl(apiKey, musicModel);

      console.log(`Music gen using AI Studio music model: ${musicModel}`);

      requestBody = {
        contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
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
          JSON.stringify({ error: responseMode === "vocal" ? "Invalid voice model credentials. Check Admin settings." : "Invalid API credentials or Lyria not enabled. Check Admin settings." }),
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
    let mimeType = responseMode === "vocal" ? "audio/L16;rate=24000" : "audio/wav";

    if (responseMode === "instrumental" && useVertexAI) {
      const predictions = data?.predictions;
      if (Array.isArray(predictions) && predictions.length > 0) {
        audioData = predictions[0].bytesBase64Encoded;
        mimeType = predictions[0].mimeType || "audio/wav";
      }
    } else {
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

    if (responseMode === "vocal" && mimeType.toLowerCase().includes("audio/l16")) {
      return new Response(
        JSON.stringify({
          audioContent: pcmBase64ToWavBase64(audioData),
          mimeType: "audio/wav",
          tokensUsed,
          generationMode: responseMode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        audioContent: audioData,
        mimeType,
        tokensUsed,
        generationMode: responseMode,
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
