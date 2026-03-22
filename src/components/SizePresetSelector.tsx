import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PLATFORM_SIZES = [
  { label: "Original", w: 0, h: 0, icon: "🖼️" },
  { label: "Facebook Post", w: 1200, h: 630, icon: "📘" },
  { label: "Facebook Cover", w: 820, h: 312, icon: "📘" },
  { label: "Instagram Post", w: 1080, h: 1080, icon: "📸" },
  { label: "Instagram Story", w: 1080, h: 1920, icon: "📸" },
  { label: "TikTok", w: 1080, h: 1920, icon: "🎵" },
  { label: "YouTube Thumb", w: 1280, h: 720, icon: "▶️" },
  { label: "YouTube Video", w: 1920, h: 1080, icon: "▶️" },
  { label: "YouTube Shorts", w: 1080, h: 1920, icon: "▶️" },
  { label: "Twitter Post", w: 1200, h: 675, icon: "🐦" },
  { label: "WhatsApp DP", w: 500, h: 500, icon: "💬" },
  { label: "LinkedIn", w: 1200, h: 627, icon: "💼" },
];

export interface SelectedSize {
  w: number;
  h: number;
  label: string;
}

interface SizePresetSelectorProps {
  value: SelectedSize | null;
  onChange: (size: SelectedSize | null) => void;
}

const SizePresetSelector = ({ value, onChange }: SizePresetSelectorProps) => {
  const [customW, setCustomW] = useState("1080");
  const [customH, setCustomH] = useState("1080");
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (preset: typeof PLATFORM_SIZES[0]) => {
    if (preset.w === 0) {
      onChange(null); // Original
      setShowCustom(false);
      return;
    }
    onChange({ w: preset.w, h: preset.h, label: preset.label });
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    const w = Math.max(100, Math.min(4096, parseInt(customW) || 1080));
    const h = Math.max(100, Math.min(4096, parseInt(customH) || 1080));
    onChange({ w, h, label: `Custom ${w}×${h}` });
  };

  const isSelected = (preset: typeof PLATFORM_SIZES[0]) => {
    if (preset.w === 0) return !value;
    return value?.w === preset.w && value?.h === preset.h && value?.label === preset.label;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Output Size
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PLATFORM_SIZES.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-colors",
              isSelected(preset)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
            )}
          >
            {preset.icon} {preset.label}
            {preset.w > 0 && (
              <span className="ml-1 opacity-70">{preset.w}×{preset.h}</span>
            )}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full transition-colors",
            showCustom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
          )}
        >
          ✏️ Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            className="w-20 h-8 text-xs bg-card border-border"
            placeholder="Width"
            min={100}
            max={4096}
          />
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            type="number"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            className="w-20 h-8 text-xs bg-card border-border"
            placeholder="Height"
            min={100}
            max={4096}
          />
          <button
            onClick={handleCustomApply}
            className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}

      {value && (
        <p className="text-xs text-muted-foreground">
          Image will be auto-resized to {value.w}×{value.h} after generation
        </p>
      )}
    </div>
  );
};

/**
 * Resize an image URL to target dimensions using cover-fit (fills area, may crop edges).
 * Re-applies SANGIAi watermark after resize so it's never cropped.
 * Returns a new data URL.
 */
export function resizeImageToSize(
  imageUrl: string,
  targetW: number,
  targetH: number,
  watermarkText?: string,
  watermarkColor?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;

      // Cover-fit: fill entire target area, crop edges if needed
      const scale = Math.max(targetW / img.width, targetH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Re-apply watermark after resize so it's always visible
      if (watermarkText) {
        const fontSize = Math.max(14, Math.round(Math.min(targetW, targetH) * 0.035));
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.font = `bold ${fontSize}px sans-serif`;
        const colorMap: Record<string, string> = {
          white: "#ffffff",
          black: "#000000",
          blue: "#3b82f6",
          green: "#22c55e",
          yellow: "#eab308",
        };
        ctx.fillStyle = colorMap[watermarkColor || "white"] || "#ffffff";
        ctx.textBaseline = "top";
        ctx.fillText(watermarkText, fontSize * 0.5, fontSize * 0.5);
        ctx.restore();
      }

      resolve(canvas.toDataURL("image/png", 1));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

export default SizePresetSelector;
