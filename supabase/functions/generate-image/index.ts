import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildVertexUrl, hasServiceAccount, getGeminiApiKeyFromEnv } from "../_shared/vertex-auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CUSTOM_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_LOVABLE_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";
const FALLBACK_GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
] as const;

interface ApiConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  provider: string;
  useCustom: boolean;
  useVertexAI: boolean;
}

function normalizeCustomGeminiImageModel(model?: string | null) {
  const selectedModel = (model || DEFAULT_CUSTOM_GEMINI_IMAGE_MODEL).trim();
  return FALLBACK_GEMINI_IMAGE_MODELS.includes(
    selectedModel as (typeof FALLBACK_GEMINI_IMAGE_MODELS)[number],
  )
    ? selectedModel
    : DEFAULT_CUSTOM_GEMINI_IMAGE_MODEL;
}

function buildGeminiImageUrl(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function readErrorMessage(response: Response) {
  const rawText = await response.text();
  try {
    const parsed = JSON.parse(rawText);
    return parsed?.error?.message || parsed?.message || rawText;
  } catch {
    return rawText;
  }
}

function shouldRetryGeminiImageModel(status: number, message: string) {
  const msg = message.toLowerCase();
  return (
    status === 404 ||
    msg.includes("not found") ||
    msg.includes("not supported") ||
    msg.includes("no longer available") ||
    msg.includes("response modalities")
  );
}

function extractGeminiImageResponse(data: any) {
  let imageUrl = "";
  let textContent = "";
  const parts = data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      if (part.inline_data?.data) {
        imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
      if (part.text) {
        textContent = part.text;
      }
    }
  }

  return { imageUrl, textContent };
}

const CHARACTER_PRESERVATION_PROMPT = `CRITICAL INSTRUCTIONS FOR FACE PRESERVATION:
- You MUST preserve the EXACT facial features from the reference photo(s): face shape, eye shape, eye color, nose shape, lip shape, skin tone, jawline, and any distinctive features (moles, dimples, scars).
- Do NOT idealize, beautify, age, or modify the face in any way.
- The person in the generated image must be immediately recognizable as the SAME person from the reference.
- Maintain the same ethnicity, skin color, and facial proportions exactly.
- Hair color and style should match unless the prompt explicitly requests a change.`;

function buildGeminiParts(
  allCharacterUrls: string[],
  prompt: string,
  variationHint: string,
  watermarkInstruction: string,
  fullPrompt: string,
) {
  const parts: any[] = [];

  if (allCharacterUrls.length > 0) {
    allCharacterUrls.forEach((url, index) => {
      parts.push({ text: `[Reference photo of Person ${index + 1} - PRESERVE THIS EXACT FACE]` });
      if (url.startsWith("data:")) {
        const [meta, b64] = url.split(",");
        const mime = meta.match(/data:(.*?);/)?.[1] || "image/png";
        parts.push({ inline_data: { mime_type: mime, data: b64 } });
      } else {
        parts.push({ text: `(reference image URL: ${url})` });
      }
    });

    parts.push({
      text: `${CHARACTER_PRESERVATION_PROMPT}\n\nNow generate an image placing this EXACT person (with identical face from reference above) in the following scene: ${prompt}${variationHint}${watermarkInstruction}`,
    });
    return parts;
  }

  parts.push({ text: `Generate a high-quality image: ${fullPrompt}` });
  return parts;
}

async function getApiConfig(supabase: any): Promise<ApiConfig> {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key) {
    const provider = data.provider || "gemini";
    const model = provider === "openai"
      ? data.model || "gpt-4o"
      : normalizeCustomGeminiImageModel(data.model);

    if (provider === "openai") {
      return {
        apiKey: data.api_key,
        model,
        baseUrl: "https://api.openai.com/v1/chat/completions",
        provider,
        useCustom: true,
        useVertexAI: false,
      };
    }

    // Custom Gemini key enabled — also check for Vertex AI
    const useVertex = hasServiceAccount();
    return {
      apiKey: data.api_key,
      model,
      provider: "gemini",
      useCustom: true,
      useVertexAI: useVertex,
    };
  }

  // No custom key enabled — try Vertex AI with admin-configured model
  if (hasServiceAccount()) {
    const model = normalizeCustomGeminiImageModel(data?.model);
    return {
      apiKey: "",
      model,
      provider: "gemini",
      useCustom: false,
      useVertexAI: true,
    };
  }

  // Check for plain Gemini API key stored in GCP_SERVICE_ACCOUNT_JSON
  const envApiKey = getGeminiApiKeyFromEnv();
  if (envApiKey) {
    const model = normalizeCustomGeminiImageModel(data?.model);
    return {
      apiKey: envApiKey,
      model,
      provider: "gemini",
      useCustom: true,
      useVertexAI: false,
    };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No API key configured. Please set up your API key in Admin settings.");

  return {
    apiKey: lovableKey,
    model: DEFAULT_LOVABLE_IMAGE_MODEL,
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    provider: "lovable",
    useCustom: false,
    useVertexAI: false,
  };
}

async function generateWithDalle(apiKey: string, prompt: string): Promise<{ imageUrl: string; description: string }> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("DALL-E error:", response.status, errText);
    if (response.status === 429) throw { status: 429, message: "Rate limited. Wait and try again." };
    if (response.status === 401) throw { status: 401, message: "Invalid OpenAI API key. Check Admin settings." };
    throw { status: 500, message: "DALL-E generation failed." };
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw { status: 500, message: "No image returned from DALL-E." };

  return {
    imageUrl: `data:image/png;base64,${b64}`,
    description: data.data?.[0]?.revised_prompt || "",
  };
}

async function fetchGeminiImage(
  url: string,
  headers: Record<string, string>,
  body: any,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function generateWithCustomGemini(
  apiKey: string,
  selectedModel: string,
  fullPrompt: string,
  prompt: string,
  allCharacterUrls: string[],
  variationHint: string,
  watermarkInstruction: string,
  useVertexAI: boolean,
): Promise<{ imageUrl: string; description: string }> {
  const modelsToTry = [
    normalizeCustomGeminiImageModel(selectedModel),
    ...FALLBACK_GEMINI_IMAGE_MODELS.filter((model) => model !== normalizeCustomGeminiImageModel(selectedModel)),
  ];

  // Get auth headers
  let authHeaders: Record<string, string> = {};
  if (useVertexAI) {
    const token = await getAccessToken();
    authHeaders = { Authorization: `Bearer ${token}` };
  }

  for (let index = 0; index < modelsToTry.length; index++) {
    const activeModel = modelsToTry[index];

    const url = useVertexAI
      ? buildVertexUrl(activeModel)
      : buildGeminiImageUrl(activeModel, apiKey);

    console.log(`Image gen using ${useVertexAI ? "Vertex AI" : "AI Studio"} model: ${activeModel}`);

    const response = await fetchGeminiImage(url, authHeaders, {
      contents: [{
        role: "user",
        parts: buildGeminiParts(allCharacterUrls, prompt, variationHint, watermarkInstruction, fullPrompt),
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    if (response.ok) {
      const data = await response.json();
      const { imageUrl, textContent } = extractGeminiImageResponse(data);

      if (imageUrl) {
        return { imageUrl, description: textContent };
      }

      console.error(`Model ${activeModel} returned no image data.`, JSON.stringify(data));
      if (index === modelsToTry.length - 1) {
        throw { status: 500, message: "No image generated. Try a different prompt or model." };
      }
      continue;
    }

    const errorMessage = await readErrorMessage(response);
    console.error("Gemini API error:", response.status, errorMessage);

    if (response.status === 429) {
      throw { status: 429, message: "Rate limited. Please wait and try again." };
    }
    if (response.status === 401 || response.status === 403) {
      throw { status: 401, message: "Invalid API credentials. Check Admin settings." };
    }

    const shouldRetry = shouldRetryGeminiImageModel(response.status, errorMessage);
    if (!shouldRetry || index === modelsToTry.length - 1) {
      throw { status: 500, message: errorMessage || "Image generation failed." };
    }

    console.log(`Retrying with fallback model: ${modelsToTry[index + 1]}`);
  }

  throw { status: 500, message: "Image generation failed." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check global per-second rate limit
    const allowed = await checkRateLimit();
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, characterImageUrl, characterImageUrls, sceneCount = 1 } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a text prompt." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiConfig = await getApiConfig(supabase);
    console.log(`Using ${apiConfig.provider}${apiConfig.useVertexAI ? " (Vertex AI)" : ""} with model: ${apiConfig.model}`);

    const useDalle = apiConfig.useCustom && apiConfig.provider === "openai" && apiConfig.model === "dall-e-3";

    let watermarkEnabled = true;
    let watermarkColor = "white";
    try {
      const authHeader = req.headers.get("authorization");
      let userId: string | null = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }

      const wmQuery = userId
        ? supabase.from("watermark_settings").select("enabled, color").eq("user_id", userId).maybeSingle()
        : supabase.from("watermark_settings").select("enabled, color").is("user_id", null).maybeSingle();

      const { data: wmData } = await wmQuery;
      if (wmData) {
        watermarkEnabled = wmData.enabled;
        watermarkColor = wmData.color || "white";
      } else if (userId) {
        const { data: globalWm } = await supabase.from("watermark_settings").select("enabled, color").is("user_id", null).maybeSingle();
        watermarkEnabled = globalWm?.enabled ?? true;
        watermarkColor = globalWm?.color || "white";
      }
    } catch (e) {
      console.error("Error checking watermark:", e);
    }

    const allCharacterUrls: string[] = [];
    if (characterImageUrls && Array.isArray(characterImageUrls)) {
      allCharacterUrls.push(...characterImageUrls);
    } else if (characterImageUrl) {
      allCharacterUrls.push(characterImageUrl);
    }

    const count = Math.max(1, Number(sceneCount) || 1);

    const generateOne = async (index: number) => {
      const variationHint = count > 1 ? ` (variation ${index + 1} of ${count}, unique composition)` : "";
      const watermarkInstruction = watermarkEnabled
        ? `\n\nAdd a subtle watermark "SANGIAi" in upper-left, ${watermarkColor} text, ~40% opacity.`
        : "";

      const fullPrompt = allCharacterUrls.length > 0
        ? `${CHARACTER_PRESERVATION_PROMPT}\n\nGenerate an image with the EXACT person(s) from the reference photo(s) in this scene: ${prompt}${variationHint}. The face must be identical to the reference - same features, same skin tone, same structure. Do NOT change or idealize the face.${watermarkInstruction}`
        : `${prompt}${variationHint}${watermarkInstruction}`;

      if (useDalle) {
        return generateWithDalle(apiConfig.apiKey, fullPrompt);
      }

      if ((apiConfig.useCustom || apiConfig.useVertexAI) && apiConfig.provider === "gemini") {
        return generateWithCustomGemini(
          apiConfig.apiKey,
          apiConfig.model,
          fullPrompt,
          prompt,
          allCharacterUrls,
          variationHint,
          watermarkInstruction,
          apiConfig.useVertexAI,
        );
      }

      // Lovable AI gateway path
      let messages: any[];

      if (allCharacterUrls.length > 0 && apiConfig.provider !== "openai") {
        const contentParts: any[] = [];
        allCharacterUrls.forEach((url, i) => {
          contentParts.push({ type: "text", text: `[Reference photo of Person ${i + 1} - PRESERVE THIS EXACT FACE]` });
          contentParts.push({ type: "image_url", image_url: { url } });
        });
        contentParts.push({ type: "text", text: `${CHARACTER_PRESERVATION_PROMPT}\n\nGenerate an image placing this EXACT person (identical face from reference) in: ${prompt}${variationHint}${watermarkInstruction}` });
        messages = [{ role: "user", content: contentParts }];
      } else {
        messages = [{ role: "user", content: `Generate a high-quality image: ${fullPrompt}` }];
      }

      let response2: Response | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const body: any = { model: apiConfig.model, messages };
        if (apiConfig.provider !== "openai") {
          body.modalities = ["image", "text"];
        }

        response2 = await fetch(apiConfig.baseUrl!, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response2.ok) break;

        if (response2.status === 429 && attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }

        if (response2.status === 429) throw { status: 429, message: "Rate limited. Please wait and try again." };
        if (response2.status === 401) throw { status: 401, message: `Invalid ${apiConfig.provider} API key. Check Admin settings.` };
        if (response2.status === 402) throw { status: 402, message: "Credits exhausted. Add your own API key in Admin." };

        const errText = await response2.text();
        console.error("API error:", response2.status, errText);
        throw { status: 500, message: "Image generation failed." };
      }

      if (!response2 || !response2.ok) throw { status: 500, message: "Generation unavailable." };

      const data = await response2.json();
      let imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      let textContent = data.choices?.[0]?.message?.content || "";

      if (!imageUrl) {
        const parts2 = data.candidates?.[0]?.content?.parts;
        if (parts2) {
          for (const part of parts2) {
            if (part.inline_data?.data) imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            if (part.text) textContent = part.text;
          }
        }
      }

      if (!imageUrl) throw { status: 500, message: "No image generated. Try a different prompt." };
      return { imageUrl, description: textContent };
    };

    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        results.push(await generateOne(i));
      } catch (err: any) {
        if (err.status) {
          return new Response(JSON.stringify({ error: err.message }),
            { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw err;
      }
      if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
    }

    const estimatedTokens = results.length * 100 + Math.ceil(prompt.length / 4);

    return new Response(
      JSON.stringify({ images: results, imageUrl: results[0]?.imageUrl, description: results[0]?.description, tokensUsed: estimatedTokens }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
