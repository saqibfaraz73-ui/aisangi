import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type WatermarkColor = "white" | "black" | "blue" | "green" | "yellow";

export function useWatermark() {
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkColor, setWatermarkColor] = useState<WatermarkColor>("white");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true);
      try {
        if (user) {
          const { data: userSetting } = await supabase
            .from("watermark_settings")
            .select("enabled, color")
            .eq("user_id", user.id)
            .maybeSingle();

          if (userSetting) {
            setWatermarkEnabled(userSetting.enabled);
            setWatermarkColor((userSetting.color as WatermarkColor) || "white");
            setLoading(false);
            return;
          }
        }

        const { data: globalSetting } = await supabase
          .from("watermark_settings")
          .select("enabled, color")
          .is("user_id", null)
          .maybeSingle();

        setWatermarkEnabled(globalSetting?.enabled ?? true);
        setWatermarkColor((globalSetting?.color as WatermarkColor) || "white");
      } catch (e) {
        console.error("Error fetching watermark setting:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, [user]);

  return { watermarkEnabled, watermarkColor, loading };
}
