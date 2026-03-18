import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: string;
  useCustom: boolean;
}

async function getApiConfig(supabase: any): Promise<ApiConfig> {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key) {
    const provider = data.provider || "gemini";
    const model = data.model || (provider === "openai" ? "gpt-4o" : "gemini-2.0-flash-exp");

    let baseUrl: string;
    if (provider === "openai") {
      baseUrl = "https://api.openai.com/v1/chat/completions";
    } else {
      baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    }

    return { apiKey: data.api_key, model, baseUrl, provider, useCustom: true };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No API key configured. Please set up your API key in Admin settings.");

  return {
    apiKey: lovableKey,
    model: "google/gemini-3.1-flash-image-preview",
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    provider: "lovable",
    useCustom: false,
  };
}

// For OpenAI DALL-E image generation
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    console.log(`Using ${apiConfig.provider} with model: ${apiConfig.model}`);

    // Check if OpenAI with DALL-E model (separate image API)
    const useDalle = apiConfig.useCustom && apiConfig.provider === "openai" && apiConfig.model === "dall-e-3";

    // Check watermark setting
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

    // Character URLs
    const allCharacterUrls: string[] = [];
    if (characterImageUrls && Array.isArray(characterImageUrls)) {
      allCharacterUrls.push(...characterImageUrls);
    } else if (characterImageUrl) {
      allCharacterUrls.push(characterImageUrl);
    }

    const count = Math.min(Math.max(1, Number(sceneCount) || 1), 4);

    const generateOne = async (index: number) => {
      const variationHint = count > 1 ? ` (variation ${index + 1} of ${count}, unique composition)` : "";
      const watermarkInstruction = watermarkEnabled
        ? `\n\nAdd a subtle watermark "SANGIAi" in upper-left, ${watermarkColor} text, ~40% opacity.`
        : "";

      const fullPrompt = allCharacterUrls.length > 0
        ? `Generate image with the person(s) from reference photo(s) in this scene: ${prompt}${variationHint}. Keep faces identical to references.${watermarkInstruction}`
        : `${prompt}${variationHint}${watermarkInstruction}`;

      // DALL-E path
      if (useDalle) {
        return generateWithDalle(apiConfig.apiKey, fullPrompt);
      }

      // Custom Gemini: use native Gemini API with responseModalities
      if (apiConfig.useCustom && apiConfig.provider === "gemini") {
        // Models that support image generation via responseModalities
        const IMAGE_CAPABLE_MODELS = [
          "gemini-2.0-flash-exp",
          "gemini-2.5-flash-preview-05-20", 
          "gemini-2.5-pro-preview-05-06",
          "gemini-2.0-flash-thinking-exp",
        ];
        let geminiModel = apiConfig.model;
        // Auto-switch non-image-capable models to gemini-2.0-flash-exp
        if (!IMAGE_CAPABLE_MODELS.includes(geminiModel)) {
          console.log(`Model ${geminiModel} doesn't support image gen, switching to gemini-2.0-flash-exp`);
          geminiModel = "gemini-2.0-flash-exp";
        }
        const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiConfig.apiKey}`;

        const parts: any[] = [];
        if (allCharacterUrls.length > 0) {
          allCharacterUrls.forEach((url, i) => {
            parts.push({ text: `[Reference face ${i + 1}]` });
            // If it's a data URL, extract base64
            if (url.startsWith("data:")) {
              const [meta, b64] = url.split(",");
              const mime = meta.match(/data:(.*?);/)?.[1] || "image/png";
              parts.push({ inline_data: { mime_type: mime, data: b64 } });
            } else {
              parts.push({ text: `(reference image URL: ${url})` });
            }
          });
          parts.push({ text: `Generate image of this exact person in: ${prompt}${variationHint}${watermarkInstruction}` });
        } else {
          parts.push({ text: `Generate a high-quality image: ${fullPrompt}` });
        }

        let response: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          response = await fetch(nativeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          });

          if (response.ok) break;
          if (response.status === 429 && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 2000));
            continue;
          }
          if (response.status === 429) throw { status: 429, message: "Rate limited. Please wait and try again." };
          if (response.status === 401 || response.status === 403) throw { status: 401, message: "Invalid Gemini API key. Check Admin settings." };

          const errText = await response.text();
          console.error("Gemini native API error:", response.status, errText);
          throw { status: 500, message: "Image generation failed." };
        }

        if (!response || !response.ok) throw { status: 500, message: "Generation unavailable." };

        const data = await response.json();
        let imageUrl = "";
        let textContent = "";
        const resParts = data.candidates?.[0]?.content?.parts;
        if (resParts) {
          for (const part of resParts) {
            if (part.inlineData?.data) imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            if (part.inline_data?.data) imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            if (part.text) textContent = part.text;
          }
        }

        if (!imageUrl) throw { status: 500, message: "No image generated. Try a different prompt or a different model." };
        return { imageUrl, description: textContent };
      }

      // Lovable AI gateway / OpenAI chat completions path
      let messages: any[];

      if (allCharacterUrls.length > 0 && apiConfig.provider !== "openai") {
        const contentParts: any[] = [];
        allCharacterUrls.forEach((url, i) => {
          contentParts.push({ type: "text", text: `[Reference face ${i + 1}]` });
          contentParts.push({ type: "image_url", image_url: { url } });
        });
        contentParts.push({ type: "text", text: `Generate image of this exact person in: ${prompt}${variationHint}${watermarkInstruction}` });
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

        response2 = await fetch(apiConfig.baseUrl, {
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

    return new Response(
      JSON.stringify({ images: results, imageUrl: results[0]?.imageUrl, description: results[0]?.description }),
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
