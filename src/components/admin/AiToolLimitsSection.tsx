import { useState, useEffect } from "react";
import { Crown, Save, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SECTION_LABELS, LIMIT_TYPE_LABELS } from "./GlobalLimitsSection";

const AI_SECTIONS = ["paraphrase", "summarizer", "presentation"];

interface PremiumAILimit {
  id: string;
  section: string;
  daily_limit: number;
  limit_type: string;
}

const AiToolLimitsSection = () => {
  const [limits, setLimits] = useState<PremiumAILimit[]>([]);
  const [edited, setEdited] = useState<Record<string, { limit: number; type: string }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchLimits = async () => {
    const { data } = await supabase.from("premium_usage_limits").select("*").in("section", AI_SECTIONS);
    if (data) setLimits(data as PremiumAILimit[]);
  };

  useEffect(() => { fetchLimits(); }, []);

  const addSection = async (section: string) => {
    setSaving(true);
    const { error } = await supabase.from("premium_usage_limits").insert({ section, daily_limit: 20, limit_type: "per_day" });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Added" }); fetchLimits(); }
    setSaving(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const [id, v] of Object.entries(edited)) {
        const { error } = await supabase.from("premium_usage_limits").update({ daily_limit: v.limit, limit_type: v.type, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      }
      toast({ title: "AI tool premium limits saved!" });
      setEdited({}); fetchLimits();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const existing = new Set(limits.map(l => l.section));
  const available = AI_SECTIONS.filter(s => !existing.has(s));

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="font-display font-bold text-lg text-foreground">AI Tool Limits (Premium Users)</h2>
        </div>
        {limits.length > 0 && (
          <Button onClick={save} disabled={saving || Object.keys(edited).length === 0} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-4">Set usage limits for premium users on AI-powered tools (Paraphrase, Summarizer, Presentation). These tools use Vertex AI credits.</p>

      {limits.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {limits.map(l => (
            <div key={l.id} className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border">
              <span className="text-xs font-medium text-foreground flex-1 truncate">{SECTION_LABELS[l.section] || l.section}</span>
              <Input type="number" min={0} value={edited[l.id]?.limit ?? l.daily_limit} onChange={e => setEdited(p => ({ ...p, [l.id]: { limit: parseInt(e.target.value) || 0, type: p[l.id]?.type ?? l.limit_type } }))} className="w-16 text-center text-xs bg-card border-border" />
              <Select value={edited[l.id]?.type ?? l.limit_type} onValueChange={v => setEdited(p => ({ ...p, [l.id]: { limit: p[l.id]?.limit ?? l.daily_limit, type: v } }))}>
                <SelectTrigger className="w-24 text-xs bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(LIMIT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground self-center mr-1">Add limit:</span>
          {available.map(s => (
            <Button key={s} variant="outline" size="sm" className="text-xs h-7" onClick={() => addSection(s)} disabled={saving}>
              <Plus className="h-3 w-3 mr-1" />{SECTION_LABELS[s] || s}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiToolLimitsSection;
