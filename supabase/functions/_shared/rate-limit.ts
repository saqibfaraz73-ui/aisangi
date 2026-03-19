import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Checks global per-second rate limit.
 * Returns true if request is allowed, false if rate limited.
 */
export async function checkRateLimit(): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc("check_rate_limit");
  if (error) {
    console.error("Rate limit check error:", error.message);
    // Allow request if rate limit check fails
    return true;
  }
  return data === true;
}
