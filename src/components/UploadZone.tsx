import { useCallback, useState } from "react";
import { Upload, X, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadZoneProps {
  icon: LucideIcon;
  label: string;
  accept: string;
  hint: string;
  onFile: (file: File | null) => void;
  preview?: string | null;
}

const UploadZone = ({ icon: Icon, label, accept, hint, onFile, preview }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setFileName(file.name);
        onFile(file);
      }
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      setFileName(file?.name || null);
      onFile(file);
    },
    [onFile]
  );

  const clear = () => {
    setFileName(null);
    onFile(null);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-card"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center gap-3 p-6 cursor-pointer min-h-[160px]">
        <input type="file" accept={accept} onChange={handleChange} className="hidden" />
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.img
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={preview}
              alt="Preview"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-primary"
            />
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted"
            >
              <Icon className="h-6 w-6 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
        {fileName && (
          <span className="text-xs text-primary truncate max-w-full">{fileName}</span>
        )}
      </label>
      {fileName && (
        <button
          onClick={(e) => { e.preventDefault(); clear(); }}
          className="absolute top-2 right-2 p-1 rounded-full bg-muted hover:bg-destructive/20 transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

export default UploadZone;
