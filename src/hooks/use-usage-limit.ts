import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export function useUsageLimit(section: string) {
  const { user } = useAuth();
  const { toast } = useToast();

  const checkLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const clientOnlySections = ["image_to_video", "audio_overlay"];
    const usesGeminiCredits = !clientOnlySections.includes(section);

    if (usesGeminiCredits) {
      // Check global daily cap
      const { data: capData } = await supabase
        .from("global_usage_cap")
        .select("enabled, daily_limit")
        .limit(1)
        .maybeSingle();

      if (capData?.enabled) {
        const { count: globalCount } = await supabase
          .from("usage_log")
          .select("*", { count: "exact", head: true })
          .in("section", ["text_to_image", "script_ai", "voice_tts", "music_gen"])
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

      // Check daily token cap
      const { data: tokenCapData } = await supabase
        .from("daily_token_cap" as any)
        .select("enabled, daily_limit")
        .limit(1)
        .maybeSingle();

      if ((tokenCapData as any)?.enabled) {
        const { data: tokenLogs } = await supabase
          .from("usage_log")
          .select("tokens_used")
          .in("section", ["text_to_image", "script_ai", "voice_tts", "music_gen"])
          .gte("used_at", todayStart.toISOString());

        const totalTokens = (tokenLogs || []).reduce((sum, log) => sum + ((log as any).tokens_used || 0), 0);

        if (totalTokens >= (tokenCapData as any).daily_limit) {
          toast({
            title: "Daily token limit reached",
            description: `The platform has used ${totalTokens.toLocaleString()} / ${(tokenCapData as any).daily_limit.toLocaleString()} tokens today. Try again tomorrow.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    // Check section-specific caps
    const sectionCapMap: Record<string, string> = {
      text_to_image: "image_generation_cap",
      script_ai: "script_generation_cap",
      voice_tts: "voice_generation_cap",
      music_gen: "music_generation_cap",
    };

    const capTable = sectionCapMap[section];
    if (capTable) {
      const { data: sectionCapData } = await supabase
        .from(capTable as "image_generation_cap" | "script_generation_cap" | "voice_generation_cap" | "music_generation_cap")
        .select("enabled, daily_limit")
        .limit(1)
        .maybeSingle();

      if (sectionCapData?.enabled) {
        const { count: sectionCount } = await supabase
          .from("usage_log")
          .select("*", { count: "exact", head: true })
          .eq("section", section)
          .gte("used_at", todayStart.toISOString());

        if ((sectionCount ?? 0) >= sectionCapData.daily_limit) {
          const labels: Record<string, string> = {
            text_to_image: "Image generation",
            script_ai: "Script generation",
            voice_tts: "Voice generation",
          };
          toast({
            title: `${labels[section] || section} limit reached`,
            description: `The platform has reached its daily limit of ${sectionCapData.daily_limit}. Try again tomorrow.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    // Check per-user limit
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
      const { data: globalData } = await supabase
        .from("usage_limits")
        .select("daily_limit, limit_type")
        .eq("section", section)
        .single();

      if (!globalData) return true;
      limit = globalData.daily_limit;
      limitType = (globalData as any).limit_type || "per_day";
    }

    const now = new Date();
    let windowStart: Date;

    switch (limitType) {
      case "per_minute":
        windowStart = new Date(now.getTime() - 60 * 1000);
        break;
      case "per_hour":
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "per_day":
      default:
        windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        break;
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

    return true;
  }, [user, section, toast]);

  const trackUsage = useCallback(async (tokensUsed: number = 0) => {
    if (!user) return;
    await supabase.from("usage_log").insert({
      user_id: user.id,
      section,
      tokens_used: tokensUsed,
    } as any);
  }, [user, section]);

  /** Legacy: check + track in one call (no token info) */
  const checkAndTrack = useCallback(async (): Promise<boolean> => {
    const allowed = await checkLimit();
    if (!allowed) return false;
    await trackUsage(0);
    return true;
  }, [checkLimit, trackUsage]);

  /** Get remaining uses available for this user in the current window */
  const getRemainingUses = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    // Check per-user limit
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
      const { data: globalData } = await supabase
        .from("usage_limits")
        .select("daily_limit, limit_type")
        .eq("section", section)
        .single();

      if (!globalData) return Infinity;
      limit = globalData.daily_limit;
      limitType = (globalData as any).limit_type || "per_day";
    }

    const now = new Date();
    let windowStart: Date;
    switch (limitType) {
      case "per_minute":
        windowStart = new Date(now.getTime() - 60 * 1000);
        break;
      case "per_hour":
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "per_day":
      default:
        windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        break;
    }

    const { count } = await supabase
      .from("usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("section", section)
      .gte("used_at", windowStart.toISOString());

    return Math.max(0, limit - (count ?? 0));
  }, [user, section]);

  return { checkLimit, trackUsage, checkAndTrack, getRemainingUses };
}
