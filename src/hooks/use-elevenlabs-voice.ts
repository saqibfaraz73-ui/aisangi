import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ElevenLabsConfig {
  enabled: boolean;
  voiceName: string;
}

export function useElevenLabsVoice() {
  const [config, setConfig] = useState<ElevenLabsConfig>({ enabled: false, voiceName: "My Clone Voice" });

  useEffect(() => {
    supabase
      .from("elevenlabs_settings")
      .select("enabled, voice_name")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({ enabled: data.enabled, voiceName: data.voice_name });
        }
      });
  }, []);

  return config;
}
