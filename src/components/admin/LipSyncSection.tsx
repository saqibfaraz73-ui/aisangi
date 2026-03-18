import { useEffect, useState } from "react";
import { Video, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const LipSyncSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHeygenKey, setShowHeygenKey] = useState(false);
  const [showDidKey, setShowDidKey] = useState(false);

  const [provider, setProvider] = useState("heygen");
  const [heygenKey, setHeygenKey] = useState("");
  const [didKey, setDidKey] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lipsync_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setProvider(data.provider || "heygen");
      setHeygenKey(data.heygen_api_key || "");
      setDidKey(data.did_api_key || "");
      setEnabled(Boolean(data.enabled));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const activeKey = provider === "heygen" ? heygenKey : didKey;
    if (enabled && !activeKey.trim()) {
      toast({ title: `${provider === "heygen" ? "HeyGen" : "D-ID"} API key is required when enabled`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("lipsync_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        provider,
        heygen_api_key: heygenKey.trim(),
        did_api_key: didKey.trim(),
        enabled,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase.from("lipsync_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lipsync_settings").insert(payload);
        if (error) throw error;
      }

      toast({ title: "Lip-sync settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Video className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Lip-Sync Video API</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Connect HeyGen or D-ID to create lip-synced animated videos from images. Choose one provider.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Enable Lip-Sync</label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Provider</label>
          <RadioGroup value={provider} onValueChange={setProvider} className="flex gap-4" disabled={!enabled}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="heygen" id="heygen" disabled={!enabled} />
              <Label htmlFor="heygen" className="cursor-pointer">HeyGen</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="did" id="did" disabled={!enabled} />
              <Label htmlFor="did" className="cursor-pointer">D-ID</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">HeyGen API Key</label>
          <div className="relative">
            <Input
              type={showHeygenKey ? "text" : "password"}
              value={heygenKey}
              onChange={(e) => setHeygenKey(e.target.value)}
              placeholder="sk_..."
              className="pr-10"
              disabled={!enabled}
            />
            <button
              type="button"
              onClick={() => setShowHeygenKey(!showHeygenKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showHeygenKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your key from <a href="https://app.heygen.com/settings?nav=API" target="_blank" rel="noopener noreferrer" className="text-primary underline">HeyGen Dashboard</a>
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">D-ID API Key</label>
          <div className="relative">
            <Input
              type={showDidKey ? "text" : "password"}
              value={didKey}
              onChange={(e) => setDidKey(e.target.value)}
              placeholder="Basic ..."
              className="pr-10"
              disabled={!enabled}
            />
            <button
              type="button"
              onClick={() => setShowDidKey(!showDidKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showDidKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your key from <a href="https://studio.d-id.com/account-settings" target="_blank" rel="noopener noreferrer" className="text-primary underline">D-ID Studio</a>
          </p>
        </div>

        {provider === "heygen" && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">HeyGen:</strong> Creates talking avatar videos from images using their API v2. Supports custom voice with audio input.
          </div>
        )}
        {provider === "did" && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">D-ID:</strong> Creates animated talking head videos using their Talks API. Supports text-to-speech and audio-driven lip sync.
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Lip-Sync Settings
        </Button>
      </div>
    </motion.div>
  );
};

export default LipSyncSection;
