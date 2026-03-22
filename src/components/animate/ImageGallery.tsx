import { Upload, X, Plus, Clock, Film, Volume2, Video } from "lucide-react";
import { ANIMATION_STYLES, type AnimationStyle, type MediaItem } from "./types";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

interface ImageGalleryProps {
  items: MediaItem[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onDurationChange: (index: number, duration: number) => void;
  onStyleChange: (index: number, style: AnimationStyle) => void;
  onAudioChange: (index: number, file: File | null) => void;
}

const PREVIEW_ANIMATION: Record<AnimationStyle, string> = {
  "none": "",
  "zoom-in": "animate-preview-zoom-in",
  "zoom-out": "animate-preview-zoom-out",
  "pan-left": "animate-preview-pan-left",
  "pan-right": "animate-preview-pan-right",
  "pan-up": "animate-preview-pan-up",
  "ken-burns": "animate-preview-ken-burns",
  "drift": "animate-preview-drift",
  "dramatic-zoom": "animate-preview-dramatic-zoom",
};

const ImageGallery = ({ items, onAdd, onRemove, onDurationChange, onStyleChange, onAudioChange }: ImageGalleryProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showStylePicker, setShowStylePicker] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Upload Media <span className="text-muted-foreground font-normal">({items.length} added)</span>
      </label>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border">
              {/* Thumbnail */}
              <div
                className="aspect-video overflow-hidden relative"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <img
                  src={item.thumbnail}
                  alt={`Media ${i + 1}`}
                  className={`w-full h-full object-cover transition-transform ${
                    item.type === "image" && hoveredIndex === i ? PREVIEW_ANIMATION[item.style] : ""
                  }`}
                />
                {item.type === "video" && (
                  <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Video className="h-2.5 w-2.5" /> VIDEO
                  </div>
                )}
                {hoveredIndex === i && item.type === "image" && (
                  <div className="absolute inset-0 bg-background/30 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-semibold text-foreground bg-background/70 px-2 py-0.5 rounded">
                      {ANIMATION_STYLES.find(s => s.value === item.style)?.label || "Ken Burns"}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-[96px] left-1 text-xs bg-background/80 text-foreground px-1.5 py-0.5 rounded font-medium">
                {i + 1}
              </span>

              {/* Duration slider (images only, videos use natural duration) */}
              {item.type === "image" ? (
                <div className="flex items-center gap-1.5 p-1.5 bg-card border-t border-border">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Slider
                    min={3}
                    max={30}
                    step={1}
                    value={[item.duration]}
                    onValueChange={([v]) => onDurationChange(i, v)}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-medium text-foreground w-6 text-right">{item.duration}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1.5 bg-card border-t border-border">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    {item.duration.toFixed(1)}s (video)
                  </span>
                </div>
              )}

              {/* Per-image animation style (images only) */}
              {item.type === "image" && (
                <div className="relative">
                  <button
                    onClick={() => setShowStylePicker(showStylePicker === i ? null : i)}
                    className="flex items-center gap-1 w-full p-1.5 bg-card border-t border-border text-left hover:bg-muted transition-colors"
                  >
                    <Film className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-medium text-foreground truncate flex-1">
                      {ANIMATION_STYLES.find(s => s.value === item.style)?.label || "Ken Burns"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">▾</span>
                  </button>

                  {showStylePicker === i && (
                    <div className="absolute bottom-full left-0 right-0 z-10 bg-card border border-border rounded-lg shadow-lg p-1 mb-1 max-h-48 overflow-y-auto">
                      {ANIMATION_STYLES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            onStyleChange(i, s.value);
                            setShowStylePicker(null);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors ${
                            item.style === s.value
                              ? "bg-primary/15 text-foreground font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="block font-medium">{s.label}</span>
                          <span className="block text-[9px] opacity-70">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Per-item audio */}
              <div className="border-t border-border">
                {item.audio ? (
                  <div className="flex items-center gap-1 p-1.5 bg-card">
                    <Volume2 className="h-3 w-3 text-accent shrink-0" />
                    <span className="text-[10px] text-foreground truncate flex-1">{item.audio.file.name}</span>
                    <button
                      onClick={() => onAudioChange(i, null)}
                      className="h-4 w-4 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-1 p-1.5 bg-card cursor-pointer hover:bg-muted transition-colors">
                    <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground">+ Add audio/voice</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onAudioChange(i, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}

          {/* Add more button */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card aspect-video">
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-1">Add</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onAdd} />
          </label>
        </div>
      )}

      {items.length === 0 && (
        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Click to upload images or videos</span>
          <span className="text-xs text-muted-foreground mt-1">Mix images & video clips for a slideshow</span>
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onAdd} />
        </label>
      )}
    </div>
  );
};

export default ImageGallery;
