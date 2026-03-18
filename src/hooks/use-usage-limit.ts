import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export function useUsageLimit(section: string) {
  const { user } = useAuth();
  const { toast } = useToast();

  const checkAndTrack = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Check global daily cap first
    const { data: capData } = await supabase
      .from("global_usage_cap")
      .select("enabled, daily_limit")
      .limit(1)
      .maybeSingle();

    if (capData?.enabled) {
      const { count: globalCount } = await supabase
        .from("usage_log")
        .select("*", { count: "exact", head: true })
        .gte("used_at", todayStart.toISOString());

      if ((globalCount ?? 0) >= capData.daily_limit) {
        toast({
          title: "Global daily limit reached",
          description: `The platform has reached its daily limit of ${capData.daily_limit} total requests. Try again tomorrow.`,
          variant: "destructive",
        });
        return false;
      }
    }

    // Check image generation daily cap (for text_to_image section only)
    if (section === "text_to_image") {
      const { data: imageCapData } = await supabase
        .from("image_generation_cap")
        .select("enabled, daily_limit")
        .limit(1)
        .maybeSingle();

      if (imageCapData?.enabled) {
        const { count: imageCount } = await supabase
          .from("usage_log")
          .select("*", { count: "exact", head: true })
          .eq("section", "text_to_image")
          .gte("used_at", todayStart.toISOString());

        if ((imageCount ?? 0) >= imageCapData.daily_limit) {
          toast({
            title: "Image generation limit reached",
            description: `The platform has reached its daily limit of ${imageCapData.daily_limit} image generations. Try again tomorrow.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    // Check for per-user limit first
    const { data: userLimitData } = await supabase
      .from("user_usage_limits")
      .select("custom_limit, limit_type")
      .eq("user_id", user.id)
      .eq("section", section)
      .maybeSingle();

    let limit: number;
    let limitType: string;

    if (userLimitData) {
      limit = userLimitData.custom_limit;
      limitType = userLimitData.limit_type;
    } else {
      // Fall back to global limit
      const { data: globalData } = await supabase
        .from("usage_limits")
        .select("daily_limit, limit_type")
        .eq("section", section)
        .single();

      if (!globalData) return true; // No limit set
      limit = globalData.daily_limit;
      limitType = (globalData as any).limit_type || "per_day";
    }

    // Calculate time window based on limit_type
    const now = new Date();
    let windowStart: Date;

    switch (limitType) {
      case "per_minute": {
        windowStart = new Date(now.getTime() - 60 * 1000);
        break;
      }
      case "per_hour": {
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      }
      case "per_day":
      default: {
        windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        break;
      }
    }

    const { count } = await supabase
      .from("usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("section", section)
      .gte("used_at", windowStart.toISOString());

    if ((count ?? 0) >= limit) {
      const timeLabel = limitType === "per_minute" ? "minute" : limitType === "per_hour" ? "hour" : "day";
      toast({
        title: "Usage limit reached",
        description: `You've used all ${limit} uses for this feature this ${timeLabel}. Try again later.`,
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
