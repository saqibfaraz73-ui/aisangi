import { useState, useEffect } from "react";
import { Crown, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SECTION_LABELS: Record<string, string> = {
  text_to_image: "Text to Image",
  image_to_video: "Image to Video",
  script_ai: "Script AI",
  music_gen: "Music AI",
  voice_generator: "Voice AI",
  lip_sync: "Lip Sync",
  prompt_generator: "Prompt AI",
};

const LIMIT_TYPE_LABELS: Record<string, string> = {
  per_day: "Per Day",
  per_hour: "Per Hour",
  per_minute: "Per Minute",
};

interface PremiumLimit {
  id: string;
  section: string;
  daily_limit: number;
  limit_type: string;
}

const PremiumLimitsSection = () => {
  const [limits, setLimits] = useState<PremiumLimit[]>([]);
  const [edited, setEdited] = useState<Record<string, { daily_limit: number; limit_type: string }>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLimits = async () => {
    const { data } = await supabase.from("premium_usage_limits" as any).select("*").order("section");
    if (data) {
      setLimits(data as any);
      const init: Record<string, { daily_limit: number; limit_type: string }> = {};
      (data as any[]).forEach((l: any) => {
        init[l.id] = { daily_limit: l.daily_limit, limit_type: l.limit_type };
      });
      setEdited(init);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLimits(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const limit of limits) {
        const e = edited[limit.id];
        if (e && (e.daily_limit !== limit.daily_limit || e.limit_type !== limit.limit_type)) {
          const { error } = await supabase
            .from("premium_usage_limits" as any)
            .update({ daily_limit: e.daily_limit, limit_type: e.limit_type, updated_at: new Date().toISOString() })
            .eq("id", limit.id);
          if (error) throw error;
        }
      }
      toast({ title: "Premium limits updated!" });
      fetchLimits();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="font-display font-bold text-lg text-foreground">Premium User Limits</h2>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Set usage limits for premium users per AI section. These limits apply instead of the global free-user limits.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {limits.map((limit) => (
          <div key={limit.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
            <span className="text-sm font-medium text-foreground flex-1">
              {SECTION_LABELS[limit.section] || limit.section}
            </span>
            <Input
              type="number"
              min={0}
              value={edited[limit.id]?.daily_limit ?? limit.daily_limit}
              onChange={(e) => setEdited((p) => ({
                ...p,
                [limit.id]: { ...p[limit.id], daily_limit: parseInt(e.target.value) || 0 },
              }))}
              className="w-20 text-center bg-card border-border"
            />
            <Select
              value={edited[limit.id]?.limit_type ?? limit.limit_type}
              onValueChange={(v) => setEdited((p) => ({
                ...p,
                [limit.id]: { ...p[limit.id], limit_type: v },
              }))}
            >
              <SelectTrigger className="w-28 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LIMIT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PremiumLimitsSection;
