import { useState, useEffect } from "react";
import { Mic, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const ElevenLabsSection = () => {
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [voiceName, setVoiceName] = useState("My Clone Voice");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("elevenlabs_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setApiKey(data.api_key);
      setVoiceId(data.voice_id);
      setVoiceName(data.voice_name);
      setEnabled(data.enabled);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("elevenlabs_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("elevenlabs_settings")
          .update({
            api_key: apiKey,
            voice_id: voiceId,
            voice_name: voiceName,
            enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      }

      toast({ title: "ElevenLabs settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">ElevenLabs Clone Voice</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Connect your ElevenLabs account to use your cloned voice across all TTS features.
      </p>

      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <span className="text-sm text-foreground">{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">API Key</label>
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="xi-..."
              className="flex-1"
            />
            <Button size="icon" variant="ghost" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Clone Voice ID</label>
          <Input
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="Paste your ElevenLabs Voice ID here"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Display Name</label>
          <Input
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="My Clone Voice"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </motion.div>
  );
};

export default ElevenLabsSection;
