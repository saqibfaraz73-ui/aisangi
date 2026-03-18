import { Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTION_LABELS: Record<string, string> = {
  text_to_image: "Text to Image",
  image_to_video: "Image to Video",
  audio_overlay: "Audio Overlay",
  script_ai: "Script AI",
};

const LIMIT_TYPE_LABELS: Record<string, string> = {
  per_day: "Per Day",
  per_hour: "Per Hour",
  per_minute: "Per Minute",
};

interface UsageLimit {
  id: string;
  section: string;
  daily_limit: number;
  limit_type: string;
}

interface Props {
  limits: UsageLimit[];
  editedLimits: Record<string, number>;
  editedTypes: Record<string, string>;
  onLimitChange: (id: string, value: number) => void;
  onTypeChange: (id: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
}

const GlobalLimitsSection = ({ limits, editedLimits, editedTypes, onLimitChange, onTypeChange, onSave, saving }: Props) => (
  <div className="rounded-xl border border-border bg-card p-6 mb-8">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-accent" />
        <h2 className="font-display font-bold text-lg text-foreground">Global Usage Limits</h2>
      </div>
      <Button onClick={onSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save
      </Button>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {limits.map((limit) => (
        <div key={limit.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
          <span className="text-sm font-medium text-foreground flex-1">
            {SECTION_LABELS[limit.section] || limit.section}
          </span>
          <Input
            type="number"
            min={0}
            value={editedLimits[limit.id] ?? limit.daily_limit}
            onChange={(e) => onLimitChange(limit.id, parseInt(e.target.value) || 0)}
            className="w-20 text-center bg-card border-border"
          />
          <Select value={editedTypes[limit.id] ?? limit.limit_type} onValueChange={(v) => onTypeChange(limit.id, v)}>
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

export { SECTION_LABELS, LIMIT_TYPE_LABELS };
export type { UsageLimit };
export default GlobalLimitsSection;
