import { useEffect, useState } from "react";
import { Gauge, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RateLimitSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [rps, setRps] = useState(5);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rate_limit_settings" as any)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setEnabled((data as any).enabled);
      setRps((data as any).requests_per_second);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("rate_limit_settings" as any)
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("rate_limit_settings" as any)
          .update({
            enabled,
            requests_per_second: rps,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      }
      toast({ title: "Rate limit settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-accent" />
          <h2 className="font-display font-bold text-lg text-foreground">
            Global Rate Limit (Per Second)
          </h2>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Limit the total number of API requests across all sections per second. When the limit is reached, additional requests must wait for the next second.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="rate-limit-enabled" />
          <Label htmlFor="rate-limit-enabled" className="text-sm text-foreground">
            {enabled ? "Enabled" : "Disabled"}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-foreground whitespace-nowrap">Max requests/sec:</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={rps}
            onChange={(e) => setRps(parseInt(e.target.value) || 1)}
            className="w-20 text-center bg-background border-border"
            disabled={!enabled}
          />
        </div>
      </div>
    </div>
  );
};

export default RateLimitSection;
