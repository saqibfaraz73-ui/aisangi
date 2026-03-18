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
    try {
      const authHeader = req.headers.get("authorization");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get user ID from JWT
      let userId: string | null = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }

      // Check per-user override first
      if (userId) {
        const { data: userSetting } = await supabase
          .from("watermark_settings")
          .select("enabled")
          .eq("user_id", userId)
          .maybeSingle();
        if (userSetting) {
          watermarkEnabled = userSetting.enabled;
        } else {
          // Fall back to global setting
          const { data: globalSetting } = await supabase
            .from("watermark_settings")
            .select("enabled")
            .is("user_id", null)
            .maybeSingle();
          watermarkEnabled = globalSetting?.enabled ?? true;
        }
      } else {
        const { data: globalSetting } = await supabase
          .from("watermark_settings")
          .select("enabled")
          .is("user_id", null)
          .maybeSingle();
        watermarkEnabled = globalSetting?.enabled ?? true;
      }
    } catch (e) {
      console.error("Error checking watermark setting:", e);
      // Default to enabled if check fails
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

      // Add watermark instruction if enabled
      const watermarkInstruction = watermarkEnabled
        ? `\n\nIMPORTANT: Add a subtle semi-transparent watermark text "SANGIAi" in the upper-left corner of the image. The watermark should be visible but not distracting — use white text with ~40% opacity, slightly tilted, medium font size.`
        : "";

      let messages: any[];

      if (allCharacterUrls.length > 0) {
        const personLabels = allCharacterUrls
          .map((_, i) => `Person ${i + 1}`)
          .join(", ");

        const faceRules = allCharacterUrls.length === 1
          ? `CRITICAL INSTRUCTION: The reference photo below may contain ONE or MULTIPLE people. You MUST preserve the EXACT face of EVERY person visible in the reference photo. Do NOT remove, replace, or omit ANY person from the reference. Do NOT alter, stylize, or change ANY facial features of ANY person.

Scene to generate: ${prompt}${variationHint}

Rules:
1. EVERY person's face MUST be an exact match to how they appear in the reference photo — same eyes, nose, mouth, jawline, skin tone, facial structure, and all distinguishing features
2. If the reference photo shows 2 or more people, ALL of them MUST appear in the generated image with their exact faces preserved
3. Do NOT keep only one person and remove others — every person in the reference MUST be in the output
4. Do NOT change age, ethnicity, skin color, or facial proportions of ANY person
5. Keep the same facial hair, eyebrow shape, and facial marks if visible on each person
6. Only change clothing/pose/background to match the scene description
7. The result should be photorealistic and look like a real unedited photo of these exact people${watermarkInstruction}`
          : `CRITICAL INSTRUCTION: There are ${allCharacterUrls.length} reference photos below (${personLabels}). Each reference photo may contain ONE or MULTIPLE people. You MUST use the EXACT face of EVERY person visible in EACH reference photo. Do NOT alter, stylize, remove, or change ANY facial features of ANY person. ALL people from ALL references must appear in the generated image.

Scene to generate: ${prompt}${variationHint}

Rules:
1. EVERY person's face MUST be an exact match to their reference photo — same eyes, nose, mouth, jawline, skin tone, facial structure
2. If a reference photo contains multiple people, ALL of them MUST appear in the generated image
3. Do NOT swap, merge, or blend faces between people — each person keeps their OWN unique face
4. Do NOT remove or omit any person from any reference photo
5. Do NOT change age, ethnicity, skin color, or facial proportions of ANY person
6. Keep facial hair, eyebrow shape, and facial marks exactly as shown for each person
7. Person 1 = first reference image, Person 2 = second reference image, etc.
8. The result should be photorealistic and look like a real unedited photo of all these people together${watermarkInstruction}`;

        const contentParts: any[] = [
          { type: "text", text: faceRules },
        ];

        allCharacterUrls.forEach((url, i) => {
          contentParts.push({
            type: "text",
            text: `--- Reference photo for Person ${i + 1}: ---`,
          });
          contentParts.push({
            type: "image_url",
            image_url: { url },
          });
        });

        messages = [{ role: "user", content: contentParts }];
      } else {
        messages = [
          {
            role: "user",
            content: `Generate a high-quality, realistic image based on this description: ${prompt}${variationHint}${watermarkInstruction}`,
          },
        ];
      }

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages,
            modalities: ["image", "text"],
          }),
        }
      );

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
