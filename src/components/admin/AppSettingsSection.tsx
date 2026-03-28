import { useState, useEffect } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const KEYS = ["play_store_url", "privacy_policy", "about_app"];

const AppSettingsSection = () => {
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
      toast({ title: "App settings saved!" });
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
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">App Settings</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">Play Store URL (for Upgrade to Premium button)</Label>
          <Input
            value={settings.play_store_url || ""}
            onChange={(e) => setSettings((p) => ({ ...p, play_store_url: e.target.value }))}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Privacy Policy</Label>
          <Textarea
            value={settings.privacy_policy || ""}
            onChange={(e) => setSettings((p) => ({ ...p, privacy_policy: e.target.value }))}
            rows={6}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">About App</Label>
          <Textarea
            value={settings.about_app || ""}
            onChange={(e) => setSettings((p) => ({ ...p, about_app: e.target.value }))}
            rows={6}
            className="mt-1"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save App Settings
        </Button>
      </div>
    </div>
  );
};

export default AppSettingsSection;
