import { useEffect, useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface WatermarkSetting {
  id: string;
  enabled: boolean;
  user_id: string | null;
}

interface WatermarkSectionProps {
  users: Profile[];
}

const WatermarkSection = ({ users }: WatermarkSectionProps) => {
  const { toast } = useToast();
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalId, setGlobalId] = useState<string | null>(null);
  const [userOverrides, setUserOverrides] = useState<WatermarkSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("watermark_settings").select("*");
    if (data) {
      const global = data.find((s: any) => s.user_id === null);
      if (global) {
        setGlobalEnabled(global.enabled);
        setGlobalId(global.id);
      }
      setUserOverrides(data.filter((s: any) => s.user_id !== null) as WatermarkSetting[]);
    }
  };

  const toggleGlobal = async () => {
    setSaving(true);
    try {
      const newVal = !globalEnabled;
      if (globalId) {
        const { error } = await supabase
          .from("watermark_settings")
          .update({ enabled: newVal, updated_at: new Date().toISOString() })
          .eq("id", globalId);
        if (error) throw error;
      }
      setGlobalEnabled(newVal);
      toast({ title: `Watermark ${newVal ? "enabled" : "disabled"} globally` });
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addUserOverride = async () => {
    if (!selectedUserId) return;
    // Check if override already exists
    if (userOverrides.find((o) => o.user_id === selectedUserId)) {
      toast({ title: "Override already exists for this user", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("watermark_settings")
        .insert({ user_id: selectedUserId, enabled: false });
      if (error) throw error;
      toast({ title: "Watermark disabled for user" });
      setSelectedUserId("");
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Failed to add override", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeUserOverride = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("watermark_settings")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "User override removed" });
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleUserOverride = async (id: string, currentEnabled: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("watermark_settings")
        .update({ enabled: !currentEnabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const usersWithoutOverride = users.filter(
    (u) => !userOverrides.find((o) => o.user_id === u.id)
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">
          SANGIAi Watermark
        </h2>
      </div>

      {/* Global toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Global Watermark</p>
          <p className="text-xs text-muted-foreground">
            Apply "SANGIAi" watermark on all generated images & videos
          </p>
        </div>
        <Switch
          checked={globalEnabled}
          onCheckedChange={toggleGlobal}
          disabled={saving}
        />
      </div>

      {/* Per-user overrides */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Per-User Overrides</p>
        <p className="text-xs text-muted-foreground">
          Disable watermark for specific users (overrides global setting)
        </p>

        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select user to disable watermark..." />
            </SelectTrigger>
            <SelectContent>
              {usersWithoutOverride.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.email} {u.full_name ? `(${u.full_name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={addUserOverride}
            disabled={!selectedUserId || saving}
            size="sm"
            className="gradient-accent text-accent-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
          </Button>
        </div>

        {userOverrides.length > 0 && (
          <div className="space-y-2 mt-2">
            {userOverrides.map((override) => {
              const user = users.find((u) => u.id === override.user_id);
              return (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {user?.email || override.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Watermark: {override.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={override.enabled}
                      onCheckedChange={() => toggleUserOverride(override.id, override.enabled)}
                      disabled={saving}
                    />
                    <Button
                      onClick={() => removeUserOverride(override.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 px-2"
                      disabled={saving}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatermarkSection;
