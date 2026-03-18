import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export function useUsageLimit(section: string) {
  const { user } = useAuth();
  const { toast } = useToast();

  const checkAndTrack = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    // Get limit for this section
    const { data: limitData } = await supabase
      .from("usage_limits")
      .select("daily_limit")
      .eq("section", section)
      .single();

    if (!limitData) return true; // No limit set, allow

    // Count today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("section", section)
      .gte("used_at", today.toISOString());

    if ((count ?? 0) >= limitData.daily_limit) {
      toast({
        title: "Daily limit reached",
        description: `You've used all ${limitData.daily_limit} daily uses for this feature. Try again tomorrow.`,
        variant: "destructive",
      });
      return false;
    }

    // Track usage
    await supabase.from("usage_log").insert({
      user_id: user.id,
      section,
    });

    return true;
  }, [user, section, toast]);

  return { checkAndTrack };
}
