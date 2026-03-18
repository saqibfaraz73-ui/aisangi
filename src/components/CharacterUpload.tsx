import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Upload, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CharacterUploadProps {
  characterImage: string | null;
  onCharacterChange: (imageDataUrl: string | null) => void;
}

const CharacterUpload = ({ characterImage, onCharacterChange }: CharacterUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onCharacterChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [onCharacterChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        AI Character (Optional)
      </label>
      
      <AnimatePresence mode="wait">
        {characterImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
          >
            <img
              src={characterImage}
              alt="AI Character"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-semibold text-foreground">Character Active</p>
              <p className="text-xs text-muted-foreground">
                This face will appear in generated images
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCharacterChange(null)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-card"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <label className="flex items-center gap-3 p-4 cursor-pointer">
              <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Upload a selfie or photo</p>
                <p className="text-xs text-muted-foreground">
                  AI will use this face as the character in generated images
                </p>
              </div>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CharacterUpload;
