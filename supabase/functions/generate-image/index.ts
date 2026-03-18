import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApiSettings {
  api_key: string;
  provider: string;
  model: string;
  enabled: boolean;
}

async function getApiConfig(supabase: any): Promise<{ apiKey: string; model: string; baseUrl: string; useCustom: boolean }> {
  const { data } = await supabase
    .from("api_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data?.enabled && data?.api_key) {
    return {
      apiKey: data.api_key,
      model: data.model || "gemini-2.0-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      useCustom: true,
    };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No API key configured. Please set up your Gemini API key in Admin settings.");

  return {
    apiKey: lovableKey,
    model: "google/gemini-3.1-flash-image-preview",
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    useCustom: false,
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

    // Get API configuration (custom Gemini or Lovable AI)
    const apiConfig = await getApiConfig(supabase);
    console.log(`Using ${apiConfig.useCustom ? "custom Gemini" : "Lovable AI"} with model: ${apiConfig.model}`);

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

      if (userId) {
        const { data: userSetting } = await supabase
          .from("watermark_settings")
          .select("enabled, color")
          .eq("user_id", userId)
          .maybeSingle();
        if (userSetting) {
          watermarkEnabled = userSetting.enabled;
          watermarkColor = userSetting.color || "white";
        } else {
          const { data: globalSetting } = await supabase
            .from("watermark_settings")
            .select("enabled, color")
            .is("user_id", null)
            .maybeSingle();
          watermarkEnabled = globalSetting?.enabled ?? true;
          watermarkColor = globalSetting?.color || "white";
        }
      } else {
        const { data: globalSetting } = await supabase
          .from("watermark_settings")
          .select("enabled, color")
          .is("user_id", null)
          .maybeSingle();
        watermarkEnabled = globalSetting?.enabled ?? true;
        watermarkColor = globalSetting?.color || "white";
      }
    } catch (e) {
      console.error("Error checking watermark setting:", e);
    }

    // Support both legacy single image and new multi-image
    const allCharacterUrls: string[] = [];
    if (characterImageUrls && Array.isArray(characterImageUrls)) {
      allCharacterUrls.push(...characterImageUrls);
    } else if (characterImageUrl) {
      allCharacterUrls.push(characterImageUrl);
    }

    const count = Math.min(Math.max(1, Number(sceneCount) || 1), 4);
    console.log(`Generating ${count} image(s) with ${allCharacterUrls.length} character ref(s), watermark: ${watermarkEnabled}`);

    const generateOne = async (index: number) => {
      const variationHint = count > 1 ? ` (variation ${index + 1} of ${count}, create a unique composition)` : "";

      const watermarkInstruction = watermarkEnabled
        ? `\n\nIMPORTANT: Add a subtle semi-transparent watermark text "SANGIAi" in the upper-left corner of the image. The watermark should be visible but not distracting — use ${watermarkColor} colored text with ~40% opacity, slightly tilted, medium font size.`
        : "";

      let messages: any[];

      if (allCharacterUrls.length > 0) {
        const contentParts: any[] = [];
        allCharacterUrls.forEach((url, i) => {
          contentParts.push({
            type: "text",
            text: allCharacterUrls.length > 1 ? `[Reference face for Person ${i + 1}]` : `[Reference face photo]`,
          });
          contentParts.push({ type: "image_url", image_url: { url } });
        });

        const faceInstruction = allCharacterUrls.length === 1
          ? `Generate a NEW image of the EXACT SAME PERSON shown in the reference photo above, placed in this scene: ${prompt}${variationHint}\n\nCRITICAL RULES:\n- The person's face MUST be identical to the reference\n- Do NOT alter the face in any way\n- Keep same hair color and style\n- Only change clothing, pose, and background\n- Output must be photorealistic${watermarkInstruction}`
          : `Generate a NEW image with ALL ${allCharacterUrls.length} people from the reference photos above, placed in this scene: ${prompt}${variationHint}\n\nCRITICAL RULES:\n- Each person's face MUST be identical to their reference\n- Do NOT swap, blend, or alter any faces\n- ALL must appear\n- Output must be photorealistic${watermarkInstruction}`;

        contentParts.push({ type: "text", text: faceInstruction });
        messages = [{ role: "user", content: contentParts }];
      } else {
        messages = [{
          role: "user",
          content: `Generate a high-quality, realistic image based on this description: ${prompt}${variationHint}${watermarkInstruction}`,
        }];
      }

      let response: Response | null = null;
      let lastErrorText = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Calling ${apiConfig.useCustom ? "Gemini API" : "AI gateway"} for image ${index + 1} (attempt ${attempt})...`);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiConfig.useCustom) {
          headers["Authorization"] = `Bearer ${apiConfig.apiKey}`;
        } else {
          headers["Authorization"] = `Bearer ${apiConfig.apiKey}`;
        }

        response = await fetch(apiConfig.baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: apiConfig.model,
            messages,
            modalities: ["image", "text"],
          }),
        });

        console.log(`API responded with status: ${response.status}`);

        if (response.ok) break;

        if (response.status === 429) {
          lastErrorText = await response.text();
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
            continue;
          }
          throw { status: 429, message: "Too many requests. Please wait a few seconds and try again." };
        }

        if (response.status === 402) {
          throw { status: 402, message: "AI credits exhausted. Please add your own Gemini API key in Admin settings." };
        }

        lastErrorText = await response.text();
        console.error("API error:", response.status, lastErrorText);
        throw { status: 500, message: "Failed to generate image. Please try again." };
      }

      if (!response || !response.ok) {
        throw { status: 500, message: "Image generation temporarily unavailable." };
      }

      const data = await response.json();
      
      // Handle response - Gemini direct API has different response format
      let imageUrl: string | undefined;
      let textContent = "";

      if (apiConfig.useCustom) {
        // Google Gemini OpenAI-compatible endpoint
        imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        textContent = data.choices?.[0]?.message?.content || "";
        
        // Fallback: check inline_data format
        if (!imageUrl) {
          const parts = data.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inline_data?.data) {
                imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
              }
              if (part.text) textContent = part.text;
            }
          }
        }
      } else {
        imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        textContent = data.choices?.[0]?.message?.content || "";
      }

      if (!imageUrl) {
        console.error("No image in response:", JSON.stringify(data).substring(0, 500));
        throw { status: 500, message: "No image was generated. Try a different prompt." };
      }

      return { imageUrl, description: textContent };
    };

    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        const result = await generateOne(i);
        results.push(result);
      } catch (err: any) {
        if (err.status) {
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw err;
      }
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        images: results,
        imageUrl: results[0]?.imageUrl,
        description: results[0]?.description,
      }),
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
