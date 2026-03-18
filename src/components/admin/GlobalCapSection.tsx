import { useEffect, useState } from "react";
import { Globe, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const GlobalCapSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(1400);
  const [todayUsage, setTodayUsage] = useState(0);
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [capRes, usageRes] = await Promise.all([
      supabase.from("global_usage_cap").select("*").limit(1).maybeSingle(),
      supabase
        .from("usage_log")
        .select("*", { count: "exact", head: true })
        .gte("used_at", todayStart.toISOString()),
    ]);

    if (capRes.data) {
      setRecordId(capRes.data.id);
      setEnabled(capRes.data.enabled);
      setDailyLimit(capRes.data.daily_limit);
    }
    setTodayUsage(usageRes.count ?? 0);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (recordId) {
        const { error } = await supabase
          .from("global_usage_cap")
          .update({ enabled, daily_limit: dailyLimit, updated_at: new Date().toISOString() })
          .eq("id", recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("global_usage_cap")
          .insert({ enabled, daily_limit: dailyLimit });
        if (error) throw error;
      }
      toast({ title: "Global cap settings saved!" });
      fetchData();
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

  const usagePercent = dailyLimit > 0 ? Math.round((todayUsage / dailyLimit) * 100) : 0;
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = todayUsage >= dailyLimit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Global Daily Cap</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Limits total API requests across <strong>all users combined</strong> per day to stay within your Gemini Tier 1 free quota.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Enable Global Cap</label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Daily Request Limit (all users combined)</label>
          <Input
            type="number"
            min={1}
            value={dailyLimit}
            onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">
            Gemini Tier 1 allows ~1,500 requests/day. Set below that for a safety margin.
          </p>
        </div>

        {/* Usage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Today's usage</span>
            <span className={`font-semibold ${isAtLimit ? "text-destructive" : isNearLimit ? "text-yellow-500" : "text-foreground"}`}>
              {todayUsage} / {dailyLimit}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {isAtLimit && enabled && (
            <p className="text-xs text-destructive font-medium">
              ⚠️ Daily cap reached — all image & script generation is paused until midnight.
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Global Cap Settings
        </Button>
      </div>
    </motion.div>
  );
};

export default GlobalCapSection;
