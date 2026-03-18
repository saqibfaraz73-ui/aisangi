import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check watermark setting for the user
    let watermarkEnabled = true;
    let watermarkColor = "white";
    try {
      const authHeader = req.headers.get("authorization");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log(`Generating ${count} image(s) with ${allCharacterUrls.length} character ref(s), watermark: ${watermarkEnabled}, color: ${watermarkColor}`);

    const generateOne = async (index: number) => {
      const variationHint = count > 1 ? ` (variation ${index + 1} of ${count}, create a unique composition)` : "";

      // Add watermark instruction if enabled
      const watermarkInstruction = watermarkEnabled
        ? `\n\nIMPORTANT: Add a subtle semi-transparent watermark text "SANGIAi" in the upper-left corner of the image. The watermark should be visible but not distracting — use ${watermarkColor} colored text with ~40% opacity, slightly tilted, medium font size.`
        : "";

      let messages: any[];

      if (allCharacterUrls.length > 0) {
        const contentParts: any[] = [];

        // Put reference images FIRST so the model anchors on them
        allCharacterUrls.forEach((url, i) => {
          contentParts.push({
            type: "text",
            text: allCharacterUrls.length > 1 ? `[Reference face for Person ${i + 1}]` : `[Reference face photo]`,
          });
          contentParts.push({
            type: "image_url",
            image_url: { url },
          });
        });

        // Then add the generation instruction
        const faceInstruction = allCharacterUrls.length === 1
          ? `Generate a NEW image of the EXACT SAME PERSON shown in the reference photo above, placed in this scene: ${prompt}${variationHint}

CRITICAL RULES:
- The person's face MUST be identical to the reference — same eyes, nose, lips, jawline, skin tone, facial marks
- Do NOT replace, alter, beautify, age, or change the face in any way
- Keep the same hair color and style
- Only change clothing, pose, and background to fit the scene
- Output must be photorealistic — like a real photograph of this exact person${watermarkInstruction}`
          : `Generate a NEW image with ALL ${allCharacterUrls.length} people from the reference photos above, placed in this scene: ${prompt}${variationHint}

CRITICAL RULES:
- Each person's face MUST be identical to their reference — same eyes, nose, lips, jawline, skin tone
- Person 1 = first reference, Person 2 = second reference, etc.
- Do NOT swap, blend, or alter any faces
- Do NOT omit any person — ALL must appear
- Keep same hair color and style for each person
- Only change clothing, pose, and background to fit the scene
- Output must be photorealistic — like a real group photograph${watermarkInstruction}`;

        contentParts.push({ type: "text", text: faceInstruction });

        messages = [{ role: "user", content: contentParts }];

      } else {
        messages = [
          {
            role: "user",
            content: `Generate a high-quality, realistic image based on this description: ${prompt}${variationHint}${watermarkInstruction}`,
          },
        ];
      }

      console.log(`Calling AI gateway for image ${index + 1}...`);
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages,
            modalities: ["image", "text"],
          }),
        }
      );
      console.log(`AI gateway responded with status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 429) {
          throw { status: 429, message: "Rate limit reached. Please wait a moment and try again." };
        }
        if (response.status === 402) {
          throw { status: 402, message: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." };
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw { status: 500, message: "Failed to generate image. Please try again." };
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = data.choices?.[0]?.message?.content || "";

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
