import { useState, useEffect } from "react";
import { Smartphone, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const KEYS = ["admob_enabled", "admob_publisher_id", "admob_banner_unit_id", "admob_interstitial_unit_id"];

const AdMobSection = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", KEYS)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d) => (map[d.key] = d.value));
          setSettings(map);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from("app_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
      }
      toast({ title: "AdMob settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">AdMob Ads Settings</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Configure AdMob ads for the Android app. Premium users will not see ads.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={settings.admob_enabled === "true"}
            onCheckedChange={(v) => setSettings((p) => ({ ...p, admob_enabled: v ? "true" : "false" }))}
          />
          <Label>Enable Ads</Label>
        </div>

        <div>
          <Label className="text-xs">Publisher ID</Label>
          <Input
            value={settings.admob_publisher_id || ""}
            onChange={(e) => setSettings((p) => ({ ...p, admob_publisher_id: e.target.value }))}
            placeholder="ca-app-pub-XXXXXXXXXXXXXXXX"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Banner Ad Unit ID</Label>
          <Input
            value={settings.admob_banner_unit_id || ""}
            onChange={(e) => setSettings((p) => ({ ...p, admob_banner_unit_id: e.target.value }))}
            placeholder="ca-app-pub-XXXXXXX/YYYYYYY"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Interstitial Ad Unit ID</Label>
          <Input
            value={settings.admob_interstitial_unit_id || ""}
            onChange={(e) => setSettings((p) => ({ ...p, admob_interstitial_unit_id: e.target.value }))}
            placeholder="ca-app-pub-XXXXXXX/ZZZZZZZ"
            className="mt-1"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save AdMob Settings
        </Button>
      </div>
    </div>
  );
};

export default AdMobSection;
