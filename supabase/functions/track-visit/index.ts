import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_path, device_type, browser, os, session_id, user_id } = await req.json();

    // Get country from IP using free API
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";

    let country = "unknown";
    let city = "unknown";

    try {
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=country,city`);
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.country) country = geo.country;
        if (geo.city) city = geo.city;
      }
    } catch {
      // Geo lookup failed, continue with unknown
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("page_visits").insert({
      user_id: user_id || null,
      page_path: page_path || "/",
      device_type: device_type || "unknown",
      browser: browser || "unknown",
      os: os || "unknown",
      country,
      city,
      ip_address: clientIp,
      session_id: session_id || null,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Track visit error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
