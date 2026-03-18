import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useWatermark() {
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true);
      try {
        if (user) {
          // Check per-user override first
          const { data: userSetting } = await supabase
            .from("watermark_settings")
            .select("enabled")
            .eq("user_id", user.id)
            .maybeSingle();

          if (userSetting) {
            setWatermarkEnabled(userSetting.enabled);
            setLoading(false);
            return;
          }
        }

        // Fall back to global setting
        const { data: globalSetting } = await supabase
          .from("watermark_settings")
          .select("enabled")
          .is("user_id", null)
          .maybeSingle();

        setWatermarkEnabled(globalSetting?.enabled ?? true);
      } catch (e) {
        console.error("Error fetching watermark setting:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, [user]);

  return { watermarkEnabled, loading };
}
