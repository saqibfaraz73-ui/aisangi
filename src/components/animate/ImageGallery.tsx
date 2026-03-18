import { Upload, X, Plus, Clock } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  durations: number[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onDurationChange: (index: number, duration: number) => void;
}

const DURATION_OPTIONS = [3, 5, 8, 10];

const ImageGallery = ({ images, durations, onAdd, onRemove, onDurationChange }: ImageGalleryProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Upload Images <span className="text-muted-foreground font-normal">({images.length} added)</span>
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border">
              <div className="aspect-video">
                <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 left-1 text-xs bg-background/80 text-foreground px-1.5 py-0.5 rounded font-medium">
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
