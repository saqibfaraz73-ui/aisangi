import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    model: "google/gemini-3-flash-preview",
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    useCustom: false,
  };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiConfig = await getApiConfig(supabase);
    console.log(`Using ${apiConfig.useCustom ? "custom Gemini" : "Lovable AI"} with model: ${apiConfig.model}`);

    const count = sceneCount || 3;

    const systemPrompt = `You are an expert viral video scriptwriter. Given a video idea, generate:
1. A list of scene descriptions (visual prompts for AI image generation) — each should be vivid, detailed, and suitable for generating a realistic image.
2. A voiceover narration script that tells the story across all scenes.

Respond ONLY with valid JSON using this exact structure:
{
  "title": "Short catchy video title",
  "scenes": [
    {
      "sceneNumber": 1,
      "imagePrompt": "Detailed visual description for AI image generation...",
      "narration": "The voiceover text for this scene..."
    }
  ],
  "fullNarration": "The complete voiceover script combining all scenes...",
  "hashtags": ["relevant", "hashtags"]
}

Generate exactly ${count} scenes. Make the image prompts highly detailed with lighting, style, colors, and mood. Make the narration engaging and suitable for short-form viral content.`;

    const response = await fetch(apiConfig.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Video idea: ${idea}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add your own Gemini API key in Admin settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("API error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-script error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
