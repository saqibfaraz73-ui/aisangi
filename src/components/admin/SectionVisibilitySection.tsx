import { useState, useEffect } from "react";
import { Eye, EyeOff, Crown, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SectionVisibility {
  id: string;
  section: string;
  status: string;
}

const SECTION_LABELS: Record<string, string> = {
  text_to_image: "🖼️ Text to Image",
  image_to_video: "🎬 Image to Video (Animate)",
  script_ai: "📝 Script Generator",
  voice_generator: "🎙️ Voice Generator",
  music_generator: "🎵 Music Generator",
  lip_sync: "👄 Lip Sync",
  prompt_generator: "💡 Prompt AI",
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  enabled: { label: "Enabled (All Users)", icon: <Eye className="h-4 w-4" />, color: "text-green-500" },
  hidden: { label: "Hidden (Disabled)", icon: <EyeOff className="h-4 w-4" />, color: "text-destructive" },
  premium_only: { label: "Premium Only", icon: <Crown className="h-4 w-4" />, color: "text-yellow-500" },
};

const SectionVisibilitySection = () => {
  const [sections, setSections] = useState<SectionVisibility[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSections = async () => {
    const { data } = await supabase.from("section_visibility").select("*").order("section");
    if (data) {
      setSections(data as SectionVisibility[]);
      setEdited({});
    }
    setLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const hasChanges = Object.keys(edited).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [id, status] of Object.entries(edited)) {
        const { error } = await supabase
          .from("section_visibility")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
      toast({ title: "Section visibility updated!" });
      fetchSections();
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
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Section Visibility</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Control which AI sections are visible to users. Hidden sections won't appear. Premium sections show a lock for non-premium users.
      </p>

      <div className="space-y-3">
        {sections.map((s) => {
          const currentStatus = edited[s.id] ?? s.status;
          const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.enabled;
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              <span className={`${statusInfo.color}`}>{statusInfo.icon}</span>
              <span className="text-sm font-medium text-foreground flex-1">
                {SECTION_LABELS[s.section] || s.section}
              </span>
              <Select
                value={currentStatus}
                onValueChange={(v) => setEdited((prev) => ({ ...prev, [s.id]: v }))}
              >
                <SelectTrigger className="w-48 bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">✅ Enabled (All Users)</SelectItem>
                  <SelectItem value="hidden">🚫 Hidden (Disabled)</SelectItem>
                  <SelectItem value="premium_only">👑 Premium Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm" className="mt-4">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save Visibility Settings
      </Button>
    </div>
  );
};

export default SectionVisibilitySection;
