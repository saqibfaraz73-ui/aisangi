import { PLATFORM_PRESETS, type PlatformPreset } from "./types";

interface PlatformSelectorProps {
  platform: PlatformPreset;
  onChange: (p: PlatformPreset) => void;
}

const PLATFORM_ORDER: PlatformPreset[] = ["youtube", "tiktok", "facebook", "custom"];

const PlatformSelector = ({ platform, onChange }: PlatformSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">Output Format</label>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORM_ORDER.map((key) => {
          const p = PLATFORM_PRESETS[key];
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`text-left p-2.5 rounded-lg border transition-colors ${
                platform === key
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              <span className="text-sm font-semibold block">{p.label}</span>
              <span className="text-xs opacity-70">{p.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformSelector;
