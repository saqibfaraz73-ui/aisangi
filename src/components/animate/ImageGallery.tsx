import { Upload, X, Plus } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}

const ImageGallery = ({ images, onAdd, onRemove }: ImageGalleryProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Upload Images <span className="text-muted-foreground font-normal">({images.length} added)</span>
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-video">
              <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 left-1 text-xs bg-background/80 text-foreground px-1.5 py-0.5 rounded font-medium">
                {i + 1}
              </span>
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
