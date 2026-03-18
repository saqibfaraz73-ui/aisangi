import { Upload, X, Plus, Clock, Film } from "lucide-react";
import { ANIMATION_STYLES, type AnimationStyle } from "./types";
import { useState } from "react";

interface ImageGalleryProps {
  images: string[];
  durations: number[];
  styles: AnimationStyle[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onDurationChange: (index: number, duration: number) => void;
  onStyleChange: (index: number, style: AnimationStyle) => void;
}

const DURATION_OPTIONS = [3, 5, 8, 10];

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

const ImageGallery = ({ images, durations, styles, onAdd, onRemove, onDurationChange, onStyleChange }: ImageGalleryProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showStylePicker, setShowStylePicker] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Upload Images <span className="text-muted-foreground font-normal">({images.length} added)</span>
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border">
              <div
                className="aspect-video overflow-hidden"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <img
                  src={img}
                  alt={`Image ${i + 1}`}
                  className={`w-full h-full object-cover transition-transform ${
                    hoveredIndex === i ? PREVIEW_ANIMATION[styles[i] || "ken-burns"] : ""
                  }`}
                />
                {hoveredIndex === i && (
                  <div className="absolute inset-0 bg-background/30 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-semibold text-foreground bg-background/70 px-2 py-0.5 rounded">
                      {ANIMATION_STYLES.find(s => s.value === styles[i])?.label || "Ken Burns"}
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
              <span className="absolute bottom-[72px] left-1 text-xs bg-background/80 text-foreground px-1.5 py-0.5 rounded font-medium">
                {i + 1}
              </span>

              {/* Per-image duration selector */}
              <div className="flex items-center gap-1 p-1.5 bg-card border-t border-border">
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex gap-0.5 flex-1">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => onDurationChange(i, d)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        durations[i] === d
                          ? "bg-primary/20 text-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-image animation style selector */}
              <div className="relative">
                <button
                  onClick={() => setShowStylePicker(showStylePicker === i ? null : i)}
                  className="flex items-center gap-1 w-full p-1.5 bg-card border-t border-border text-left hover:bg-muted transition-colors"
                >
                  <Film className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-medium text-foreground truncate flex-1">
                    {ANIMATION_STYLES.find(s => s.value === styles[i])?.label || "Ken Burns"}
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
                          styles[i] === s.value
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
            </div>
          ))}

          {/* Add more button */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card aspect-video">
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-1">Add</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
          </label>
        </div>
      )}

      {images.length === 0 && (
        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Click to upload images</span>
          <span className="text-xs text-muted-foreground mt-1">Add multiple for a slideshow video</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
        </label>
      )}
    </div>
  );
};

export default ImageGallery;
