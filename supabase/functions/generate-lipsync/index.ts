import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, video_id, image_url, audio_url, text } = await req.json();

    // Fetch lipsync settings
    const { data: settings } = await supabase
      .from("lipsync_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.enabled) {
      return new Response(
        JSON.stringify({ error: "Lip-sync is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const provider = settings.provider;

    // ACTION: check_status — poll video status
    if (action === "check_status" && video_id) {
      if (provider === "heygen") {
        const res = await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
          {
            headers: {
              accept: "application/json",
              "x-api-key": settings.heygen_api_key,
            },
          }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // D-ID polling
        const res = await fetch(`https://api.d-id.com/talks/${video_id}`, {
          headers: {
            accept: "application/json",
            authorization: `Basic ${settings.did_api_key}`,
          },
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ACTION: generate — create a lip-sync video
    if (action === "generate") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (provider === "heygen") {
        // HeyGen: Upload the photo first, then generate video
        // Step 1: Upload photo to get talking_photo_id
        const uploadRes = await fetch("https://api.heygen.com/v2/photo_avatar", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": settings.heygen_api_key,
          },
          body: JSON.stringify({ image_url }),
        });
        
        // If photo avatar upload fails, try direct video generation with talking_photo
        const voiceConfig: Record<string, unknown> = audio_url
          ? { type: "audio", audio_url }
          : { type: "text", input_text: text || "Hello, this is a lip-sync test.", voice_id: "en_us_001" };

        const videoBody: Record<string, unknown> = {
          video_inputs: [
            {
              character: {
                type: "talking_photo",
                talking_photo_url: image_url,
              },
              voice: voiceConfig,
            },
          ],
          dimension: { width: 1080, height: 1920 },
          test: false,
        };

        const genRes = await fetch("https://api.heygen.com/v2/video/generate", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": settings.heygen_api_key,
          },
          body: JSON.stringify(videoBody),
        });

        const genData = await genRes.json();
        console.log("HeyGen generate response:", JSON.stringify(genData));

        if (genData.error) {
          return new Response(
            JSON.stringify({ error: genData.error.message || "HeyGen API error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            video_id: genData.data?.video_id,
            provider: "heygen",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // D-ID Talks API
        const didBody: Record<string, unknown> = {
          source_url: image_url,
          ...(audio_url
            ? { script: { type: "audio", audio_url } }
            : {
                script: {
                  type: "text",
                  input: text || "Hello, this is a lip-sync test.",
                  provider: { type: "microsoft", voice_id: "en-US-JennyNeural" },
                },
              }),
        };

        const genRes = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Basic ${settings.did_api_key}`,
          },
          body: JSON.stringify(didBody),
        });

        const genData = await genRes.json();
        console.log("D-ID generate response:", JSON.stringify(genData));

        if (genData.kind === "BadRequestError" || genRes.status >= 400) {
          return new Response(
            JSON.stringify({ error: genData.description || genData.message || "D-ID API error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            video_id: genData.id,
            provider: "did",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'generate' or 'check_status'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Lip-sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
