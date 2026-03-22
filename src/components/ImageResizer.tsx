import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Crop, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLATFORM_SIZES = [
  { label: "Facebook Post", w: 1200, h: 630, icon: "📘" },
  { label: "Facebook Cover", w: 820, h: 312, icon: "📘" },
  { label: "Instagram Post", w: 1080, h: 1080, icon: "📸" },
  { label: "Instagram Story", w: 1080, h: 1920, icon: "📸" },
  { label: "TikTok", w: 1080, h: 1920, icon: "🎵" },
  { label: "YouTube Thumb", w: 1280, h: 720, icon: "▶️" },
  { label: "YouTube Banner", w: 2560, h: 1440, icon: "▶️" },
  { label: "YouTube Video", w: 1920, h: 1080, icon: "▶️" },
  { label: "YouTube Shorts", w: 1080, h: 1920, icon: "▶️" },
  { label: "Twitter Post", w: 1200, h: 675, icon: "🐦" },
  { label: "WhatsApp DP", w: 500, h: 500, icon: "💬" },
  { label: "LinkedIn", w: 1200, h: 627, icon: "💼" },
];

interface ImageResizerProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageResizer = ({ imageUrl, onClose }: ImageResizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customW, setCustomW] = useState("1080");
  const [customH, setCustomH] = useState("1080");
  const [activeW, setActiveW] = useState(0);
  const [activeH, setActiveH] = useState(0);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setActiveW(img.width);
      setActiveH(img.height);
      setLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || activeW <= 0 || activeH <= 0) return;

    canvas.width = activeW;
    canvas.height = activeH;
    const ctx = canvas.getContext("2d")!;

    // Cover-fit: fill entire area, crop edges if needed
    const scale = Math.max(activeW / img.width, activeH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (activeW - dw) / 2;
    const dy = (activeH - dh) / 2;

    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }, [activeW, activeH]);

  useEffect(() => {
    if (loaded) drawCanvas();
  }, [loaded, drawCanvas]);

  const selectPreset = (idx: number) => {
    setSelectedPreset(idx);
    const p = PLATFORM_SIZES[idx];
    setActiveW(p.w);
    setActiveH(p.h);
    setCustomW(String(p.w));
    setCustomH(String(p.h));
  };

  const applyCustom = () => {
    const w = Math.max(50, Math.min(4096, parseInt(customW) || 512));
    const h = Math.max(50, Math.min(4096, parseInt(customH) || 512));
    setSelectedPreset(null);
    setActiveW(w);
    setActiveH(h);
    setCustomW(String(w));
    setCustomH(String(h));
  };

  const handleDownload = (format: "png" | "jpg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.download = `resized-${activeW}x${activeH}.${format}`;
    a.href = dataUrl;
    a.click();
  };

  // Preview dimensions (fit in container, responsive)
  const maxPreviewW = typeof window !== "undefined" && window.innerWidth < 480 ? Math.min(window.innerWidth - 60, 300) : 400;
  const maxPreviewH = typeof window !== "undefined" && window.innerWidth < 480 ? 250 : 350;
  const scale = Math.min(maxPreviewW / (activeW || 1), maxPreviewH / (activeH || 1), 1);
  const previewW = Math.round((activeW || 100) * scale);
  const previewH = Math.round((activeH || 100) * scale);

  return (
    <div className="space-y-3 p-3 rounded-xl border border-border bg-card overflow-hidden max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-primary" />
          <span className="text-sm font-display font-semibold text-foreground">Resize Image</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Platform presets */}
      <div className="flex flex-wrap gap-1.5">
        {PLATFORM_SIZES.map((p, i) => (
          <button
            key={i}
            onClick={() => selectPreset(i)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              selectedPreset === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/20"
            }`}
          >
            {p.icon} {p.label} ({p.w}×{p.h})
          </button>
        ))}
      </div>

      {/* Custom size */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={customW}
          onChange={(e) => setCustomW(e.target.value)}
          className="w-20 h-8 text-xs"
          placeholder="Width"
          min={50}
          max={4096}
        />
        <span className="text-xs text-muted-foreground">×</span>
        <Input
          type="number"
          value={customH}
          onChange={(e) => setCustomH(e.target.value)}
          className="w-20 h-8 text-xs"
          placeholder="Height"
          min={50}
          max={4096}
        />
        <span className="text-xs text-muted-foreground">px</span>
        <Button size="sm" onClick={applyCustom} className="h-8 text-xs">
          Apply
        </Button>
      </div>

      {/* Preview */}
      <div className="flex justify-center bg-muted/50 rounded-lg p-2">
        <canvas
          ref={canvasRef}
          style={{ width: previewW, height: previewH }}
          className="rounded border border-border"
        />
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {activeW} × {activeH} px
      </p>

      {/* Download */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleDownload("png")}
          className="flex-1 h-8 text-xs gradient-primary text-primary-foreground"
        >
          <Download className="h-3 w-3 mr-1" /> PNG
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload("jpg")}
          className="flex-1 h-8 text-xs"
        >
          <Download className="h-3 w-3 mr-1" /> JPG
        </Button>
      </div>
    </div>
  );
};

export default ImageResizer;
