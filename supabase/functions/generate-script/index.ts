import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_LOVABLE_MODEL = "google/gemini-3-flash-preview";
const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_TEXT_MODEL = "gpt-4o";
const FALLBACK_GEMINI_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
] as const;

type ApiConfig = {
  apiKey: string;
  model: string;
  provider: "gemini" | "openai" | "lovable";
  useCustom: boolean;
  useNativeGemini: boolean;
  baseUrl?: string;
};

function normalizeCustomModel(provider: string, model?: string | null) {
  if (provider === "openai") {
    if (!model || model === "dall-e-3") return DEFAULT_OPENAI_TEXT_MODEL;
    return model;
  }

  const selectedModel = (model || DEFAULT_GEMINI_TEXT_MODEL).trim();
  const loweredModel = selectedModel.toLowerCase();

  if (
    loweredModel.includes("image") ||
    loweredModel.includes("preview") ||
    loweredModel.endsWith("-exp")
  ) {
    return DEFAULT_GEMINI_TEXT_MODEL;
  }

  return selectedModel;
}

function buildGeminiUrl(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function getApiConfig(supabase: any): Promise<ApiConfig> {
  const { data } = await supabase.from("api_settings").select("*").limit(1).maybeSingle();

  if (data?.enabled && data?.api_key) {
    const provider = data.provider || "gemini";

    if (provider === "openai") {
      const model = normalizeCustomModel(provider, data.model);
      return {
        apiKey: data.api_key,
        model,
        baseUrl: "https://api.openai.com/v1/chat/completions",
        provider,
        useCustom: true,
        useNativeGemini: false,
      };
    }

    // For Gemini: use dedicated script_model if set, otherwise fall back to normalized model
    const scriptModel = data.script_model || normalizeCustomModel(provider, data.model);

    return {
      apiKey: data.api_key,
      model: scriptModel,
      provider: "gemini",
      useCustom: true,
      useNativeGemini: true,
    };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No API key configured. Set up your API key in Admin settings.");

  return {
    apiKey: lovableKey,
    model: DEFAULT_LOVABLE_MODEL,
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    provider: "lovable",
    useCustom: false,
    useNativeGemini: false,
  };
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

function extractContentFromGeminiResponse(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const textPart = parts.find((part: any) => typeof part?.text === "string");
  return textPart?.text || null;
}

function shouldRetryGeminiWithFallback(status: number, message: string) {
  const msg = message.toLowerCase();
  return (
    status === 404 ||
    msg.includes("not found") ||
    msg.includes("no longer available") ||
    msg.includes("is not supported")
  );
}

async function callGeminiScriptApi(model: string, apiKey: string, systemPrompt: string, idea: string) {
  return fetch(buildGeminiUrl(model, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Video idea: ${idea}` }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, sceneCount } = await req.json();

    if (!idea || typeof idea !== "string") {
      return new Response(JSON.stringify({ error: "Please provide a video idea" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const apiConfig = await getApiConfig(supabase);

    const sceneInstruction = sceneCount
      ? `Generate exactly ${sceneCount} scenes.`
      : `Decide the optimal number of scenes based on the idea (typically 3-10 scenes). Use as many scenes as needed to tell the story effectively.`;

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

${sceneInstruction} Detailed image prompts with lighting, style, colors, mood. Engaging narration for viral short-form content.`;

    let response: Response;
    let activeModel = apiConfig.model;

    if (apiConfig.useNativeGemini) {
      console.log(`Script gen using gemini model: ${activeModel}`);
      response = await callGeminiScriptApi(activeModel, apiConfig.apiKey, systemPrompt, idea);

      if (!response.ok) {
        const primaryError = await readErrorMessage(response);

        if (shouldRetryGeminiWithFallback(response.status, primaryError)) {
          const fallbackModels = FALLBACK_GEMINI_TEXT_MODELS.filter((m) => m !== activeModel);

          for (const fallbackModel of fallbackModels) {
            console.log(`Retrying script gen with fallback gemini model: ${fallbackModel}`);
            const retryResponse = await callGeminiScriptApi(fallbackModel, apiConfig.apiKey, systemPrompt, idea);

            if (retryResponse.ok) {
              response = retryResponse;
              activeModel = fallbackModel;
              break;
            }

            const retryError = await readErrorMessage(retryResponse);
            console.error("Fallback Gemini model failed:", fallbackModel, retryError);
          }
        }
      }
    } else {
      console.log(`Script gen using ${apiConfig.provider} model: ${apiConfig.model}`);
      response = await fetch(apiConfig.baseUrl!, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: apiConfig.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Video idea: ${idea}` },
          ],
        }),
      });
    }

    if (!response.ok) {
      const errText = await readErrorMessage(response);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: `Invalid ${apiConfig.provider} API key. Check Admin settings.` }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add your own API key in Admin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("API error:", response.status, errText);

      return new Response(JSON.stringify({
        error: apiConfig.provider === "gemini"
          ? `Gemini script generation failed: ${errText}`
          : "Script generation failed",
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = apiConfig.useNativeGemini
      ? extractContentFromGeminiResponse(data)
      : data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content from AI");

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Extract token usage
    let tokensUsed = 0;
    if (apiConfig.useNativeGemini) {
      tokensUsed = data?.usageMetadata?.totalTokenCount || 0;
    } else {
      tokensUsed = data?.usage?.total_tokens || 0;
    }

    return new Response(JSON.stringify({ ...parsed, tokensUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-script error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
