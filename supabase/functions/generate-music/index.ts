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
const AUDIO_GEN_MODEL = "gemini-2.5-flash-preview-tts";

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
      useVertexAI: hasServiceAccount(),
    };
  }

  if (hasServiceAccount()) {
    return {
      apiKey: "",
      musicModel: data?.music_model || DEFAULT_MUSIC_MODEL,
      useVertexAI: true,
    };
  }

  const envApiKey = getGeminiApiKeyFromEnv();
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      musicModel: data?.music_model || DEFAULT_MUSIC_MODEL,
      useVertexAI: false,
    };
  }

  // Fallback: use Lovable AI gateway
  return {
    apiKey: "",
    musicModel: DEFAULT_MUSIC_MODEL,
    useVertexAI: false,
    useLovableAI: true,
  };
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

/**
 * Build a rich music generation prompt that instructs the model to produce
 * actual music (instruments, melody, rhythm) rather than speech.
 */
function buildMusicPrompt(userPrompt: string, negativePrompt?: string): string {
  let musicPrompt = `Generate a musical audio track based on this description. This must be MUSIC with instruments, melody, harmony, and rhythm — NOT speech or talking. Create an actual musical composition:\n\n${userPrompt}`;
  
  if (negativePrompt?.trim()) {
    musicPrompt += `\n\nAvoid these elements: ${negativePrompt.trim()}`;
  }
  
  return musicPrompt;
}

/**
 * Try Vertex AI Lyria-002 for instrumental music generation.
 */
async function tryLyriaGeneration(
  prompt: string,
  negativePrompt: string | undefined,
  musicModel: string,
): Promise<{ audioData: string; mimeType: string; tokensUsed: number } | null> {
  try {
    const url = buildVertexUrl(musicModel, "predict");
    const token = await getAccessToken();

    console.log(`Music gen: trying Vertex AI Lyria model: ${musicModel}`);

    const instance: any = { prompt: prompt.trim() };
    if (negativePrompt?.trim()) {
      instance.negative_prompt = negativePrompt.trim();
    }

    const response = await callWithRetry(url, { Authorization: `Bearer ${token}` }, {
      instances: [instance],
      parameters: { sample_count: 1 },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Lyria failed (${response.status}):`, errText);
      return null;
    }

    const data = await response.json();
    const predictions = data?.predictions;
    if (Array.isArray(predictions) && predictions.length > 0 && predictions[0].bytesBase64Encoded) {
      return {
        audioData: predictions[0].bytesBase64Encoded,
        mimeType: predictions[0].mimeType || "audio/wav",
        tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
      };
    }
    return null;
  } catch (e) {
    console.error("Lyria generation error:", e);
    return null;
  }
}

/**
 * Generate music using Gemini audio model (AI Studio or Vertex AI).
 * Uses responseModalities: ["AUDIO"] WITHOUT speechConfig to get music, not speech.
 */
async function tryGeminiAudioGeneration(
  prompt: string,
  negativePrompt: string | undefined,
  apiKey: string,
  useVertexAI: boolean,
): Promise<{ audioData: string; mimeType: string; tokensUsed: number } | null> {
  const model = AUDIO_GEN_MODEL;
  const musicPrompt = buildMusicPrompt(prompt, negativePrompt);

  let url: string;
  let authHeaders: Record<string, string> = {};

  if (useVertexAI) {
    url = buildVertexUrl(model);
    const token = await getAccessToken();
    authHeaders = { Authorization: `Bearer ${token}` };
  } else {
    url = buildGeminiAudioUrl(apiKey, model);
  }

  console.log(`Music gen: trying Gemini audio model: ${model} (vertex: ${useVertexAI})`);

  // Important: NO speechConfig — this tells the model to generate music/audio, not speech
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: musicPrompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
    },
  };

  const response = await callWithRetry(url, authHeaders, requestBody);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gemini audio failed (${response.status}):`, errText);
    return null;
  }

  const data = await response.json();
  let audioData: string | null = null;
  let mimeType = "audio/wav";

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

  if (!audioData) return null;

  const tokensUsed = data?.usageMetadata?.totalTokenCount || 0;

  // Convert PCM to WAV if needed
  if (mimeType.toLowerCase().includes("audio/l16")) {
    return {
      audioData: pcmBase64ToWavBase64(audioData),
      mimeType: "audio/wav",
      tokensUsed,
    };
  }

  return { audioData, mimeType, tokensUsed };
}

/**
 * Last resort: use Lovable AI gateway with an audio-capable model.
 */
async function tryLovableAIGeneration(
  prompt: string,
  negativePrompt: string | undefined,
): Promise<{ audioData: string; mimeType: string; tokensUsed: number } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const musicPrompt = buildMusicPrompt(prompt, negativePrompt);
  console.log("Music gen: trying Lovable AI gateway");

  // Note: Lovable AI gateway doesn't support audio modalities directly.
  // This path won't produce audio. Return null to give a clear error.
  return null;
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

    const settings = await getSettings(supabase);
    let result: { audioData: string; mimeType: string; tokensUsed: number } | null = null;

    // Strategy 1: Try Vertex AI Lyria for best instrumental quality
    if (settings.useVertexAI && settings.musicModel) {
      result = await tryLyriaGeneration(prompt.trim(), negative_prompt, settings.musicModel);
    }

    // Strategy 2: Try Gemini audio model (works with both Vertex AI and API key)
    if (!result) {
      const apiKey = settings.apiKey || getGeminiApiKeyFromEnv() || "";
      if (settings.useVertexAI || apiKey) {
        result = await tryGeminiAudioGeneration(
          prompt.trim(),
          negative_prompt,
          apiKey,
          settings.useVertexAI,
        );
      }
    }

    // Strategy 3: If we have no credentials at all, give clear error
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Music generation requires a Gemini API key or GCP service account. Configure in Admin → Custom AI API settings.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        audioContent: result.audioData,
        mimeType: result.mimeType,
        tokensUsed: result.tokensUsed,
        generationMode: "music",
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
