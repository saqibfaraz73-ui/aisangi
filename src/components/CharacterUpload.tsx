import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CharacterUploadProps {
  characterImages: string[];
  onCharacterImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const CharacterUpload = ({
  characterImages,
  onCharacterImagesChange,
  maxImages = 4,
}: CharacterUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (characterImages.length >= maxImages) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onCharacterImagesChange([...characterImages, dataUrl]);
      };
      reader.readAsDataURL(file);
    },
    [characterImages, onCharacterImagesChange, maxImages]
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const remaining = maxImages - characterImages.length;
      const toAdd = Array.from(files).slice(0, remaining);
      toAdd.forEach((file) => handleFile(file));
    },
    [handleFile, characterImages.length, maxImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    (index: number) => {
      onCharacterImagesChange(characterImages.filter((_, i) => i !== index));
    },
    [characterImages, onCharacterImagesChange]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        AI Characters (Optional — up to {maxImages} faces)
      </label>

      {/* Show uploaded character previews */}
      {characterImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {characterImages.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <img
                src={img}
                alt={`Character ${index + 1}`}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 font-bold">
                {index + 1}
              </span>
            </motion.div>
          ))}

          {/* Add more button */}
          {characterImages.length < maxImages && (
            <label className="h-16 w-16 rounded-full border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
                multiple
              />
              <Plus className="h-5 w-5 text-muted-foreground" />
            </label>
          )}
        </div>
      )}

      {/* Upload zone when no images */}
      {characterImages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-card"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <label className="flex items-center gap-3 p-4 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
              multiple
            />
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Upload photos of people to include
              </p>
              <p className="text-xs text-muted-foreground">
                Upload up to {maxImages} face photos — AI will preserve each face exactly
              </p>
            </div>
          </label>
        </motion.div>
      )}

      {characterImages.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {characterImages.length === 1
            ? "Person 1 uploaded. Add more people or describe your scene below."
            : `${characterImages.length} people uploaded. Reference them as Person 1, Person 2, etc. in your prompt.`}
        </p>
      )}
    </div>
  );
};

export default CharacterUpload;
