import { useEffect, useState } from "react";
import { Globe, Image, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface CapState {
  id: string | null;
  enabled: boolean;
  dailyLimit: number;
  todayUsage: number;
}

const defaultCap = (limit: number): CapState => ({ id: null, enabled: true, dailyLimit: limit, todayUsage: 0 });

const CapCard = ({
  icon: Icon,
  title,
  description,
  state,
  onChange,
  onSave,
  saving,
}: {
  icon: any;
  title: string;
  description: string;
  state: CapState;
  onChange: (s: Partial<CapState>) => void;
  onSave: () => void;
  saving: boolean;
}) => {
  const usagePercent = state.dailyLimit > 0 ? Math.round((state.todayUsage / state.dailyLimit) * 100) : 0;
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = state.todayUsage >= state.dailyLimit;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold text-base text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">Enable</label>
        <Switch checked={state.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Daily Limit</label>
        <Input
          type="number"
          min={1}
          value={state.dailyLimit}
          onChange={(e) => onChange({ dailyLimit: parseInt(e.target.value) || 0 })}
          disabled={!state.enabled}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Today's usage</span>
          <span className={`font-semibold ${isAtLimit ? "text-destructive" : isNearLimit ? "text-yellow-500" : "text-foreground"}`}>
            {state.todayUsage} / {state.dailyLimit}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"}`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        {isAtLimit && state.enabled && (
          <p className="text-xs text-destructive font-medium">⚠️ Daily cap reached — generation is paused until midnight.</p>
        )}
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full" size="sm">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save
      </Button>
    </div>
  );
};

const GlobalCapSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [globalCap, setGlobalCap] = useState<CapState>(defaultCap(1400));
  const [imageCap, setImageCap] = useState<CapState>(defaultCap(240));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [capRes, imageCapRes, totalUsageRes, imageUsageRes] = await Promise.all([
      supabase.from("global_usage_cap").select("*").limit(1).maybeSingle(),
      supabase.from("image_generation_cap").select("*").limit(1).maybeSingle(),
      supabase.from("usage_log").select("*", { count: "exact", head: true }).gte("used_at", todayStart.toISOString()),
      supabase.from("usage_log").select("*", { count: "exact", head: true }).eq("section", "text_to_image").gte("used_at", todayStart.toISOString()),
    ]);

    if (capRes.data) {
      setGlobalCap({ id: capRes.data.id, enabled: capRes.data.enabled, dailyLimit: capRes.data.daily_limit, todayUsage: totalUsageRes.count ?? 0 });
    } else {
      setGlobalCap((p) => ({ ...p, todayUsage: totalUsageRes.count ?? 0 }));
    }

    if (imageCapRes.data) {
      setImageCap({ id: imageCapRes.data.id, enabled: imageCapRes.data.enabled, dailyLimit: imageCapRes.data.daily_limit, todayUsage: imageUsageRes.count ?? 0 });
    } else {
      setImageCap((p) => ({ ...p, todayUsage: imageUsageRes.count ?? 0 }));
    }

    setLoading(false);
  };

  const saveGlobal = async () => {
    setSavingGlobal(true);
    try {
      if (globalCap.id) {
        const { error } = await supabase.from("global_usage_cap").update({ enabled: globalCap.enabled, daily_limit: globalCap.dailyLimit, updated_at: new Date().toISOString() }).eq("id", globalCap.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("global_usage_cap").insert({ enabled: globalCap.enabled, daily_limit: globalCap.dailyLimit });
        if (error) throw error;
      }
      toast({ title: "Global cap saved!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingGlobal(false);
    }
  };

  const saveImage = async () => {
    setSavingImage(true);
    try {
      if (imageCap.id) {
        const { error } = await supabase.from("image_generation_cap").update({ enabled: imageCap.enabled, daily_limit: imageCap.dailyLimit, updated_at: new Date().toISOString() }).eq("id", imageCap.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("image_generation_cap").insert({ enabled: imageCap.enabled, daily_limit: imageCap.dailyLimit });
        if (error) throw error;
      }
      toast({ title: "Image generation cap saved!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingImage(false);
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Daily Caps (Gemini Quota Protection)</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <CapCard
          icon={Globe}
          title="Global Request Cap"
          description="Limits total API requests across all users combined per day."
          state={globalCap}
          onChange={(s) => setGlobalCap((p) => ({ ...p, ...s }))}
          onSave={saveGlobal}
          saving={savingGlobal}
        />
        <CapCard
          icon={Image}
          title="Image Generation Cap"
          description="Limits total image generations across all users per day (Gemini allows ~250/day)."
          state={imageCap}
          onChange={(s) => setImageCap((p) => ({ ...p, ...s }))}
          onSave={saveImage}
          saving={savingImage}
        />
      </div>
    </motion.div>
  );
};

export default GlobalCapSection;
