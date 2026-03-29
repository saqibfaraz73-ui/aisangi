import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin only");

    const { auto_confirm } = await req.json();

    // Update the app_settings table
    await adminClient
      .from("app_settings")
      .upsert({ key: "auto_confirm_email", value: auto_confirm ? "true" : "false", updated_at: new Date().toISOString() }, { onConflict: "key" });

    // Update Supabase Auth config via Management API
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
    if (projectRef) {
      const mgmtResp = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            GOTRUE_MAILER_AUTOCONFIRM: auto_confirm,
          }),
        }
      );
      if (!mgmtResp.ok) {
        console.warn("Management API call failed:", await mgmtResp.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true, auto_confirm }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
