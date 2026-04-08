import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, characterCount } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a prompt." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = Math.max(1, Number(characterCount) || 1);

    const systemPrompt = count > 1
      ? `You are a prompt optimizer for AI image generation with multiple character reference photos.
The user has uploaded ${count} separate character photos (Person 1, Person 2${count > 2 ? ", Person 3, etc." : ""}).
Your job is to rewrite their prompt so it:
1. Explicitly mentions "Person 1" and "Person 2"${count > 2 ? " (and Person 3, etc.)" : ""} by name
2. Describes what EACH person is doing or wearing separately
3. Describes their positions (e.g., "Person 1 on the left, Person 2 on the right")
4. Keeps the original scene/style/mood intact
5. Is clear and detailed for the AI to follow

RULES:
- Output ONLY the rewritten prompt, nothing else
- Do NOT add explanations or notes
- Keep it natural and descriptive
- If the original prompt says "couple", "man and woman", "two people" etc., map them to Person 1 and Person 2
- Make sure both persons are clearly described with distinct roles/positions`
      : `You are a prompt optimizer for AI image generation with a single character reference photo.
The user has uploaded 1 character photo.
Rewrite their prompt to be more detailed and effective for AI image generation.
- Add details about composition, lighting, style if missing
- Keep the original intent intact
- Output ONLY the rewritten prompt, nothing else`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Rewrite this prompt for ${count} character(s):\n\n${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI rewrite error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to rewrite prompt." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();

    if (!rewritten) {
      return new Response(
        JSON.stringify({ error: "No rewritten prompt returned." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ rewrittenPrompt: rewritten }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Rewrite prompt error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
