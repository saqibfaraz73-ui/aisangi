import { useState, useRef, useCallback, useEffect, type TouchEvent as ReactTouchEvent } from "react";
import { removeBackground } from "@imgly/background-removal";
import { Upload, Download, Crop, Eraser, Camera, Palette, ImageIcon, X, RotateCcw, ZoomIn, ZoomOut, Loader2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

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

const PASSPORT_SIZES = [
  { label: "Pakistan (35×45mm)", w: 413, h: 531, country: "🇵🇰" },
  { label: "US (2×2 inch)", w: 600, h: 600, country: "🇺🇸" },
  { label: "UK (35×45mm)", w: 413, h: 531, country: "🇬🇧" },
  { label: "EU (35×45mm)", w: 413, h: 531, country: "🇪🇺" },
  { label: "India (35×35mm)", w: 413, h: 413, country: "🇮🇳" },
  { label: "China (33×48mm)", w: 390, h: 567, country: "🇨🇳" },
];

const BG_COLORS = [
  "#FFFFFF", "#FF0000", "#0000FF", "#00FF00", "#CCCCCC",
  "#000000", "#FFA500", "#800080", "#FFD700", "#87CEEB",
];

const clampSize = (value: string, fallback: number) => {
  const parsed = parseInt(value, 10);
  return Math.max(50, Math.min(4096, Number.isNaN(parsed) ? fallback : parsed));
};

const getContainRect = (srcW: number, srcH: number, dstW: number, dstH: number) => {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let dw = dstW;
  let dh = dstH;
  let dx = 0;
  let dy = 0;

  if (srcRatio > dstRatio) {
    dh = dstW / srcRatio;
    dy = (dstH - dh) / 2;
  } else {
    dw = dstH * srcRatio;
    dx = (dstW - dw) / 2;
  }

  return { dx, dy, dw, dh };
};

const getThemeColor = (token: string, fallback: string) => {
  if (typeof window === "undefined") return `hsl(${fallback})`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value})` : `hsl(${fallback})`;
};

const loadImageElement = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("Failed to load processed image"));
  img.src = url;
});

const ImageEditorPage = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transparentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("resize");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customW, setCustomW] = useState("1080");
  const [customH, setCustomH] = useState("1080");
  const [activeW, setActiveW] = useState(0);
  const [activeH, setActiveH] = useState(0);

  // Background removal
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [customBgColor, setCustomBgColor] = useState("#FFFFFF");
  const [bgRemoved, setBgRemoved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Passport
  const [passportPreset, setPassportPreset] = useState<number | null>(null);
  const [passportBg, setPassportBg] = useState("#FFFFFF");

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const lastTouchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const lastSingleTouchRef = useRef<{ x: number; y: number } | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url);
  };

  const loadImage = (url: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImgRef.current = img;
      setActiveW(img.width);
      setActiveH(img.height);
      setCustomW(String(img.width));
      setCustomH(String(img.height));
      setImageLoaded(true);
      setBgRemoved(false);
      processedCanvasRef.current = null;
      transparentCanvasRef.current = null;
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    img.src = url;
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = processedCanvasRef.current || originalImgRef.current;
    if (!canvas || !img || activeW <= 0 || activeH <= 0) return;

    canvas.width = activeW;
    canvas.height = activeH;
    const ctx = canvas.getContext("2d")!;

    const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
    const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
    const { dx, dy, dw, dh } = getContainRect(srcW, srcH, activeW, activeH);

    // Draw checkerboard for transparency if background was removed
    if (bgRemoved) {
      const size = 10;
      for (let y = 0; y < activeH; y += size) {
        for (let x = 0; x < activeW; x += size) {
          ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? "#e0e0e0" : "#ffffff";
          ctx.fillRect(x, y, size, size);
        }
      }
    } else {
      ctx.fillStyle = passportPreset !== null
        ? passportBg
        : getThemeColor("--card", "0 0% 100%");
      ctx.fillRect(0, 0, activeW, activeH);
    }

    // Apply zoom and pan transform to the subject
    const zoomedW = dw * zoom;
    const zoomedH = dh * zoom;
    const zoomedX = dx + (dw - zoomedW) / 2 + panX;
    const zoomedY = dy + (dh - zoomedH) / 2 + panY;
    ctx.drawImage(img, 0, 0, srcW, srcH, zoomedX, zoomedY, zoomedW, zoomedH);
  }, [activeW, activeH, bgRemoved, passportBg, passportPreset, renderKey, zoom, panX, panY]);

  useEffect(() => {
    if (imageLoaded) drawCanvas();
  }, [imageLoaded, drawCanvas, renderKey, zoom, panX, panY]);

  // Touch gesture handlers
  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = getTouchDist(e.touches[0], e.touches[1]);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      lastTouchRef.current = { dist: d, cx, cy };
      lastSingleTouchRef.current = null;
    } else if (e.touches.length === 1) {
      lastSingleTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTouchRef.current = null;
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && lastTouchRef.current) {
      e.preventDefault();
      const d = getTouchDist(e.touches[0], e.touches[1]);
      const scaleDelta = d / lastTouchRef.current.dist;
      setZoom(z => Math.max(0.2, Math.min(5, z * scaleDelta)));
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPanX(px => px + (cx - lastTouchRef.current!.cx));
      setPanY(py => py + (cy - lastTouchRef.current!.cy));
      lastTouchRef.current = { dist: d, cx, cy };
    } else if (e.touches.length === 1 && lastSingleTouchRef.current) {
      const dx = e.touches[0].clientX - lastSingleTouchRef.current.x;
      const dy = e.touches[0].clientY - lastSingleTouchRef.current.y;
      setPanX(px => px + dx);
      setPanY(py => py + dy);
      lastSingleTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
    lastSingleTouchRef.current = null;
  };

  const resetZoomPan = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const selectPreset = (idx: number) => {
    setSelectedPreset(idx);
    const p = PLATFORM_SIZES[idx];
    setActiveW(p.w);
    setActiveH(p.h);
    setCustomW(String(p.w));
    setCustomH(String(p.h));
  };

  const applyCustom = () => {
    const w = clampSize(customW, 512);
    const h = clampSize(customH, 512);
    setSelectedPreset(null);
    setPassportPreset(null);
    setActiveW(w);
    setActiveH(h);
    setCustomW(String(w));
    setCustomH(String(h));
  };

  const removeBackgroundFromImage = () => {
    const img = originalImgRef.current;
    if (!img || removing) return;

    setRemoving(true);

    setTimeout(() => {
      (async () => {
        try {
          const blob = await fetch(img.src).then((response) => response.blob());
          const resultBlob = await removeBackground(blob, {
            device: "cpu",
            model: "isnet_fp16",
            proxyToWorker: true,
            output: { format: "image/png", quality: 1 },
          });

          const objectUrl = URL.createObjectURL(resultBlob);
          const resultImage = await loadImageElement(objectUrl);

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = resultImage.width;
          tempCanvas.height = resultImage.height;
          const ctx = tempCanvas.getContext("2d")!;
          ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.drawImage(resultImage, 0, 0);

          URL.revokeObjectURL(objectUrl);
          transparentCanvasRef.current = tempCanvas;
          processedCanvasRef.current = tempCanvas;
          setBgRemoved(true);
          setRenderKey((k) => k + 1);
          toast({ title: "Background removed!" });
        } catch (err) {
          console.error("BG removal error:", err);
          toast({ title: "Background removal failed", description: "Try again with a clear photo.", variant: "destructive" });
        } finally {
          setRemoving(false);
        }
      })();
    }, 50);
  };

  const applyColorToTransparent = (color: string) => {
    const src = transparentCanvasRef.current;
    if (!src) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = src.width;
    tempCanvas.height = src.height;
    const ctx = tempCanvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);

    processedCanvasRef.current = tempCanvas;
    setBgColor(color);
    setBgRemoved(false);
    setRenderKey(k => k + 1);
    toast({ title: "Background color applied" });
  };

  const applyColorBackground = async (color: string) => {
    if (transparentCanvasRef.current) {
      applyColorToTransparent(color);
      return;
    }

    // Auto-remove background first
    const img = originalImgRef.current;
    if (!img || removing) return;

    setRemoving(true);
    toast({ title: "Removing background first..." });

    try {
      const blob = await fetch(img.src).then(r => r.blob());
      const resultBlob = await removeBackground(blob, {
        device: "cpu",
        model: "isnet_fp16",
        proxyToWorker: true,
        output: { format: "image/png", quality: 1 },
      });

      const objectUrl = URL.createObjectURL(resultBlob);
      const resultImage = await loadImageElement(objectUrl);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = resultImage.width;
      tempCanvas.height = resultImage.height;
      const ctx = tempCanvas.getContext("2d")!;
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(resultImage, 0, 0);
      URL.revokeObjectURL(objectUrl);

      transparentCanvasRef.current = tempCanvas;
      applyColorToTransparent(color);
    } catch (err) {
      console.error("BG removal error:", err);
      toast({ title: "Background removal failed", description: "Try removing background manually first.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const applyImageBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Always use the transparent (bg-removed) version so image bg shows through
    const src = transparentCanvasRef.current || originalImgRef.current;
    if (!src) return;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.onload = () => {
      const w = src instanceof HTMLCanvasElement ? src.width : src.width;
      const h = src instanceof HTMLCanvasElement ? src.height : src.height;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext("2d")!;

      // Draw background image stretched to fill
      ctx.drawImage(bgImg, 0, 0, w, h);
      // Draw the transparent subject on top
      ctx.drawImage(src, 0, 0);

      processedCanvasRef.current = tempCanvas;
      setBgRemoved(false);
      setRenderKey(k => k + 1);
      toast({ title: "Background image applied" });
      URL.revokeObjectURL(bgImg.src);
    };
    bgImg.src = URL.createObjectURL(file);
    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  // Passport photo
  const generatePassport = (idx: number) => {
    const img = originalImgRef.current;
    if (!img) return;
    setPassportPreset(idx);
    const p = PASSPORT_SIZES[idx];
    setActiveW(p.w);
    setActiveH(p.h);
    setCustomW(String(p.w));
    setCustomH(String(p.h));
    setSelectedPreset(null);
    setRenderKey(k => k + 1);
  };

  const applyPassportBg = (color: string) => {
    setPassportBg(color);
    const img = processedCanvasRef.current || originalImgRef.current;
    if (!img || passportPreset === null) return;
    const p = PASSPORT_SIZES[passportPreset];

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = p.w;
    tempCanvas.height = p.h;
    const ctx = tempCanvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, p.w, p.h);

    const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
    const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
    const { dx, dy, dw, dh } = getContainRect(srcW, srcH, p.w, p.h);
    ctx.drawImage(img, 0, 0, srcW, srcH, dx, dy, dw, dh);

    processedCanvasRef.current = tempCanvas;
    setActiveW(p.w);
    setActiveH(p.h);
    setRenderKey(k => k + 1);
  };

  const resetImage = () => {
    processedCanvasRef.current = null;
    transparentCanvasRef.current = null;
    setBgRemoved(false);
    setPassportPreset(null);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    if (originalImgRef.current) {
      setActiveW(originalImgRef.current.width);
      setActiveH(originalImgRef.current.height);
    }
    setRenderKey(k => k + 1);
  };

  const handleDownload = (format: "png" | "jpg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.download = `edited-${activeW}x${activeH}.${format}`;
    a.href = dataUrl;
    a.click();
  };

  // Responsive preview
  const containerW = typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 500) : 400;
  const containerH = typeof window !== "undefined" && window.innerWidth < 640 ? 280 : 380;
  const scale = Math.min(containerW / (activeW || 1), containerH / (activeH || 1), 1);
  const previewW = Math.round((activeW || 100) * scale);
  const previewH = Math.round((activeH || 100) * scale);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-6 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Image Editor
        </h2>

        {/* Upload */}
        {!imageLoaded ? (
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl bg-card cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Upload Image</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP supported</p>
          </label>
        ) : (
          <>
            {/* Preview */}
            <div className="flex w-full justify-center overflow-hidden rounded-lg bg-muted/50 p-2 touch-none">
              <canvas
                ref={canvasRef}
                style={{ width: previewW, height: previewH }}
                className="max-w-full rounded border border-border touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">{activeW} × {activeH} px</p>

            {/* Zoom/Pan Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="text-xs h-8 w-8 p-0">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="text-xs h-8 w-8 p-0">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={resetZoomPan} className="text-xs h-8">
                <Move className="h-3 w-3 mr-1" /> Reset Position
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use pinch to zoom and drag to position the subject</p>

            {/* Actions bar */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="text-xs">
                <Upload className="h-3 w-3 mr-1" /> Change Image
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <Button size="sm" variant="outline" onClick={resetImage} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
            </div>

            {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 overflow-hidden">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="resize" className="text-xs py-2">
                  <Crop className="h-3 w-3 mr-1" /> Resize
                </TabsTrigger>
                <TabsTrigger value="background" className="text-xs py-2">
                  <Eraser className="h-3 w-3 mr-1" /> Background
                </TabsTrigger>
                <TabsTrigger value="passport" className="text-xs py-2">
                  <Camera className="h-3 w-3 mr-1" /> Passport
                </TabsTrigger>
              </TabsList>

              {/* Resize Tab */}
              <TabsContent value="resize" className="space-y-3">
                <p className="text-xs font-medium text-foreground">Platform Presets</p>
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
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="number" value={customW} onChange={e => setCustomW(e.target.value)}
                    className="h-8 w-[5.5rem] text-xs" placeholder="W" min={50} max={4096} />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input type="number" value={customH} onChange={e => setCustomH(e.target.value)}
                    className="h-8 w-[5.5rem] text-xs" placeholder="H" min={50} max={4096} />
                  <span className="text-xs text-muted-foreground">px</span>
                  <Button size="sm" onClick={applyCustom} className="h-8 text-xs">Apply</Button>
                </div>
              </TabsContent>

              {/* Background Tab */}
              <TabsContent value="background" className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Remove Background</p>
                  <p className="text-xs text-muted-foreground">Uses on-device AI to detect and remove the background automatically.</p>
                    <Button size="sm" onClick={removeBackgroundFromImage} disabled={removing} className="text-xs">
                    {removing ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing...</>
                    ) : (
                      <><Eraser className="h-3 w-3 mr-1" /> Remove Background</>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Add Color Background</p>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map(c => (
                      <button key={c} onClick={() => applyColorBackground(c)}
                        className="h-7 w-7 rounded-full border-2 border-border hover:border-primary transition-colors"
                        style={{ backgroundColor: c }} />
                    ))}
                    <div className="flex items-center gap-1">
                      <input type="color" value={customBgColor} onChange={e => setCustomBgColor(e.target.value)}
                        className="h-7 w-7 rounded-full cursor-pointer border-0 p-0" />
                      <Button size="sm" variant="outline" onClick={() => applyColorBackground(customBgColor)} className="h-7 text-xs">
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Add Image Background</p>
                  <Button size="sm" variant="outline" onClick={() => bgImageInputRef.current?.click()} className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" /> Upload Background
                  </Button>
                  <input ref={bgImageInputRef} type="file" accept="image/*" onChange={applyImageBackground} className="hidden" />
                </div>
              </TabsContent>

              {/* Passport Tab */}
              <TabsContent value="passport" className="space-y-3">
                <p className="text-xs font-medium text-foreground">Passport Photo Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {PASSPORT_SIZES.map((p, i) => (
                    <button key={i} onClick={() => generatePassport(i)}
                      className={`text-xs px-2 py-1 rounded-full transition-colors ${
                        passportPreset === i
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-primary/20"
                      }`}>
                      {p.country} {p.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Background Color</p>
                  <div className="flex flex-wrap gap-2">
                    {["#FFFFFF", "#FF0000", "#0000FF", "#CCCCCC", "#87CEEB"].map(c => (
                      <button key={c} onClick={() => applyPassportBg(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-colors ${
                          passportBg === c ? "border-primary" : "border-border hover:border-primary"
                        }`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <div className="flex items-center gap-1">
                      <input type="color" value={passportBg} onChange={e => setPassportBg(e.target.value)}
                        className="h-7 w-7 rounded-full cursor-pointer border-0 p-0" />
                      <Button size="sm" variant="outline" onClick={() => applyPassportBg(passportBg)} className="h-7 text-xs">
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tip: First remove background in Background tab, then select passport size and apply color.</p>
              </TabsContent>
            </Tabs>

            {/* Download */}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleDownload("png")}
                className="flex-1 h-9 text-xs gradient-primary text-primary-foreground">
                <Download className="h-3 w-3 mr-1" /> PNG
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload("jpg")}
                className="flex-1 h-9 text-xs">
                <Download className="h-3 w-3 mr-1" /> JPG
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ImageEditorPage;
