import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Download, Loader2, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageResizer from "@/components/ImageResizer";

interface ImageResult {
  imageUrl: string;
  description?: string;
}

interface ImageResultsProps {
  images: ImageResult[];
  isGenerating: boolean;
  prompt: string;
  sceneCount: number;
}

const handleDownload = (imageUrl: string, format: "png" | "jpg", index: number) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    if (format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const link = document.createElement("a");
    link.download = `sangi-ai-${Date.now()}-${index + 1}.${format}`;
    link.href = dataUrl;
    link.click();
  };
  img.src = imageUrl;
};

const ImageResults = ({ images, isGenerating, prompt, sceneCount }: ImageResultsProps) => {
  const [resizingIdx, setResizingIdx] = useState<number | null>(null);

  const gridClass = images.length > 1 || sceneCount > 1
    ? "grid grid-cols-2 gap-3"
    : "";

  return (
    <div className="space-y-4">
      <div className={gridClass}>
        <AnimatePresence mode="wait">
          {isGenerating ? (
            Array.from({ length: sceneCount }).map((_, i) => (
              <motion.div
                key={`loading-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card overflow-hidden min-h-[200px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-3 p-6">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl gradient-primary animate-pulse flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="absolute -inset-2 rounded-2xl border-2 border-primary/30 animate-ping" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-display font-semibold text-foreground">
                      {sceneCount > 1 ? `Scene ${i + 1}…` : "Creating…"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : images.length > 0 ? (
            images.map((img, i) => (
              <motion.div
                key={`image-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card overflow-hidden group relative"
              >
                <img
                  src={img.imageUrl}
                  alt={`${prompt} - scene ${i + 1}`}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
                {/* Download overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(img.imageUrl, "png", i)}
                    className="gradient-primary text-primary-foreground font-display text-xs h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(img.imageUrl, "jpg", i)}
                    className="border-border text-foreground font-display text-xs h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    JPG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResizingIdx(resizingIdx === i ? null : i)}
                    className="border-border text-foreground font-display text-xs h-8"
                  >
                    <Crop className="h-3 w-3 mr-1" />
                    Resize
                  </Button>
                </div>
                {resizingIdx === i && (
                  <div className="p-2">
                    <ImageResizer imageUrl={img.imageUrl} onClose={() => setResizingIdx(null)} />
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-2xl border border-border bg-card overflow-hidden min-h-[400px] flex items-center justify-center ${sceneCount > 1 ? "col-span-2" : ""}`}
            >
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your generated images will appear here
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Download all button for multiple images */}
      {images.length > 1 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <Button
            onClick={() => images.forEach((img, i) => handleDownload(img.imageUrl, "png", i))}
            className="flex-1 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All PNG
          </Button>
          <Button
            onClick={() => images.forEach((img, i) => handleDownload(img.imageUrl, "jpg", i))}
            variant="outline"
            className="flex-1 border-border text-foreground hover:bg-muted font-display font-semibold"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All JPG
          </Button>
        </motion.div>
      )}

      {/* Single image download */}
      {images.length === 1 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <Button
            onClick={() => handleDownload(images[0].imageUrl, "png", 0)}
            className="flex-1 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
          <Button
            onClick={() => handleDownload(images[0].imageUrl, "jpg", 0)}
            variant="outline"
            className="flex-1 border-border text-foreground hover:bg-muted font-display font-semibold"
          >
            <Download className="h-4 w-4 mr-2" />
            Download JPG
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ImageResults;
