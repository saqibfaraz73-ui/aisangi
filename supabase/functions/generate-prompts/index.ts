import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, count = 5, hasCharacter = false } = await req.json();

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return new Response(JSON.stringify({ error: "Please provide a topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const characterNote = hasCharacter
      ? `\n- CRITICAL: The user has uploaded their face/selfie as an AI character. Write prompts describing ONLY the SCENE and SETTING (e.g. "Standing in front of the Eiffel Tower at sunset", "Wearing elegant wedding attire in a garden"). NEVER describe the person's facial features, skin color, hair, age, gender, or body type — the AI will automatically use the uploaded face. Focus ONLY on: location, clothing, lighting, mood, pose, camera angle.`
      : "";

    const systemPrompt = `You are an expert AI image prompt engineer. Given a topic, generate exactly ${count} highly detailed, creative image generation prompts. Each prompt should be descriptive and include style, lighting, colors, mood, composition details that would produce stunning images when used with an AI image generator.

Rules:
- Return ONLY a JSON array of strings, no other text
- Each prompt should be 1-3 sentences
- Make prompts diverse in style (photorealistic, cinematic, artistic, etc.)
- Include specific details about lighting, colors, atmosphere
- Make them ready to use directly in a text-to-image AI tool
- Do NOT include any markdown formatting or code blocks${characterNote}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate ${count} image prompts for the topic: "${topic.trim()}"`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON array from response
    let prompts: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback: split by newlines and clean up
      prompts = content
        .split("\n")
        .map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").replace(/^["'-]\s*/, "").replace(/["']$/, "").trim())
        .filter((l: string) => l.length > 20);
    }

    if (!prompts.length) {
      throw new Error("Failed to generate prompts");
    }

    return new Response(JSON.stringify({ prompts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-prompts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
