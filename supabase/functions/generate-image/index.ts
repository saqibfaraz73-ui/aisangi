import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { prompt, characterImageUrl, sceneCount = 1 } = await req.json();

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

    const count = Math.min(Math.max(1, Number(sceneCount) || 1), 4);
    console.log(`Generating ${count} image(s) for prompt:`, prompt.substring(0, 100));

    const generateOne = async (index: number) => {
      const variationHint = count > 1 ? ` (variation ${index + 1} of ${count}, create a unique composition)` : "";

      let messages: any[];

      if (characterImageUrl) {
        // Use the character image as reference for the generation
        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `CRITICAL INSTRUCTION: You MUST use the EXACT face from the reference photo below. Do NOT alter, stylize, or change ANY facial features. The generated image must preserve the IDENTICAL face — same eyes, nose, mouth, jawline, skin tone, facial structure, and all distinguishing features. It should look like a real photograph of this exact same person.

Scene to generate: ${prompt}${variationHint}

Rules:
1. The face MUST be an exact match to the reference photo — as if it's the same person in a different photo
2. Do NOT change age, ethnicity, skin color, or facial proportions
3. Keep the same facial hair, eyebrow shape, and facial marks if visible
4. Only change clothing/pose/background to match the scene description
5. The result should be photorealistic and look like a real unedited photo of this person`,
              },
              {
                type: "image_url",
                image_url: { url: characterImageUrl },
              },
            ],
          },
        ];
      } else {
        messages = [
          {
            role: "user",
            content: `Generate a high-quality, realistic image based on this description: ${prompt}${variationHint}`,
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

    // Generate images sequentially to avoid rate limits
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
      // Small delay between requests to avoid rate limiting
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({ 
        images: results,
        // Keep backward compat
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
