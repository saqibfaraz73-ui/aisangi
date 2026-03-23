import { useState, useRef, useEffect, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, CropIcon, Upload, RotateCw } from "lucide-react";

const RATIOS = [
  { label: "Free", value: 0 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const ImageCropperPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [ratioIdx, setRatioIdx] = useState(0);
  const [crop, setCrop] = useState({ x: 50, y: 50, w: 200, h: 200 });
  const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0, cw: 0, ch: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, dispW: 0, dispH: 0 });

  const handleFile = (f: File) => {
    setFile(f);
    setRotation(0);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  useEffect(() => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const maxW = Math.min(500, window.innerWidth - 40);
      const scale = Math.min(maxW / img.width, 400 / img.height, 1);
      const dw = img.width * scale, dh = img.height * scale;
      setImgDims({ w: img.width, h: img.height, dispW: dw, dispH: dh });
      setCrop({ x: dw * 0.1, y: dh * 0.1, w: dw * 0.8, h: dh * 0.8 });
    };
    img.src = preview;
  }, [preview]);

  const onMouseDown = (e: React.MouseEvent, type: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    setDragStart({ x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y, cw: crop.w, ch: crop.h });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (dragging === "move") {
        setCrop(c => ({
          ...c,
          x: Math.max(0, Math.min(imgDims.dispW - c.w, dragStart.cx + dx)),
          y: Math.max(0, Math.min(imgDims.dispH - c.h, dragStart.cy + dy)),
        }));
      } else {
        const ratio = RATIOS[ratioIdx].value;
        let nw = Math.max(30, dragStart.cw + dx);
        let nh = ratio > 0 ? nw / ratio : Math.max(30, dragStart.ch + dy);
        if (ratio > 0) nw = nh * ratio;
        nw = Math.min(nw, imgDims.dispW - crop.x);
        nh = Math.min(nh, imgDims.dispH - crop.y);
        setCrop(c => ({ ...c, w: nw, h: nh }));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, dragStart, ratioIdx, imgDims]);

  const doCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const scaleX = img.width / imgDims.dispW;
    const scaleY = img.height / imgDims.dispH;
    const sx = crop.x * scaleX, sy = crop.y * scaleY;
    const sw = crop.w * scaleX, sh = crop.h * scaleY;
    const c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    const ctx = c.getContext("2d")!;
    if (rotation !== 0) {
      const rc = document.createElement("canvas");
      rc.width = img.width; rc.height = img.height;
      const rctx = rc.getContext("2d")!;
      rctx.translate(rc.width / 2, rc.height / 2);
      rctx.rotate((rotation * Math.PI) / 180);
      rctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.drawImage(rc, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    }
    const a = document.createElement("a");
    a.download = "cropped.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><CropIcon className="h-5 w-5 text-primary" /> Image Cropper</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Upload image"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Label className="mr-1">Ratio:</Label>
              {RATIOS.map((r, i) => (
                <button key={i} onClick={() => setRatioIdx(i)} className={`px-2.5 py-1 text-xs rounded-full ${ratioIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{r.label}</button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="h-4 w-4" />{rotation}°</Button>
            </div>
            <div ref={containerRef} className="relative mx-auto select-none" style={{ width: imgDims.dispW, height: imgDims.dispH }}>
              <img src={preview} alt="" className="w-full h-full rounded-lg" style={{ transform: `rotate(${rotation}deg)` }} draggable={false} />
              {/* Overlay */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-black/40" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x}px ${crop.y}px)` }} />
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                  onMouseDown={e => onMouseDown(e, "move")}
                >
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full cursor-se-resize -translate-x-0.5 -translate-y-0.5"
                    onMouseDown={e => onMouseDown(e, "resize")}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">{Math.round(crop.w * (imgDims.w / imgDims.dispW))} × {Math.round(crop.h * (imgDims.h / imgDims.dispH))} px</p>
            <Button onClick={doCrop} className="w-full"><Download className="h-4 w-4 mr-1" />Crop & Download</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageCropperPage;
