import { useState, useRef, useEffect, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, LayoutGrid, Upload, X } from "lucide-react";

const LAYOUTS = [
  { label: "2×1", cols: 2, rows: 1 },
  { label: "2×2", cols: 2, rows: 2 },
  { label: "3×1", cols: 3, rows: 1 },
  { label: "3×2", cols: 3, rows: 2 },
  { label: "3×3", cols: 3, rows: 3 },
  { label: "4×3", cols: 4, rows: 3 },
];

const PhotoCollagePage = () => {
  const [images, setImages] = useState<string[]>([]);
  const [layout, setLayout] = useState(1);
  const [gap, setGap] = useState(8);
  const [bgColor, setBgColor] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = () => setImages(prev => [...prev, r.result as string]);
      r.readAsDataURL(f);
    });
  };

  const draw = useCallback(async () => {
    const c = canvasRef.current;
    if (!c || images.length === 0) return;
    const l = LAYOUTS[layout];
    const cellW = 400, cellH = 400;
    c.width = l.cols * cellW + (l.cols + 1) * gap;
    c.height = l.rows * cellH + (l.rows + 1) * gap;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, c.width, c.height);

    const slots = l.cols * l.rows;
    for (let i = 0; i < Math.min(images.length, slots); i++) {
      const col = i % l.cols;
      const row = Math.floor(i / l.cols);
      const x = gap + col * (cellW + gap);
      const y = gap + row * (cellH + gap);
      const img = new Image();
      await new Promise<void>(resolve => {
        img.onload = () => {
          const scale = Math.max(cellW / img.width, cellH / img.height);
          const dw = img.width * scale, dh = img.height * scale;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, cellW, cellH);
          ctx.clip();
          ctx.drawImage(img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
          ctx.restore();
          resolve();
        };
        img.src = images[i];
      });
    }
  }, [images, layout, gap, bgColor]);

  useEffect(() => { draw(); }, [draw]);

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = "collage.png";
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Photo Collage</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Upload photos (select multiple)</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
        </div>
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={img} className="w-full h-full rounded object-cover border border-border" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div>
              <Label>Layout</Label>
              <div className="flex gap-2">
                {LAYOUTS.map((l, i) => (
                  <button key={i} onClick={() => setLayout(i)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${layout === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}>{l.label}</button>
                ))}
              </div>
            </div>
            <div><Label>Gap: {gap}px</Label><Slider value={[gap]} onValueChange={v => setGap(v[0])} min={0} max={40} /></div>
            <div><Label>Background</Label><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
            <div className="flex justify-center overflow-auto"><canvas ref={canvasRef} className="max-w-full rounded-lg border border-border" style={{ maxHeight: 400 }} /></div>
            <Button variant="outline" onClick={download} className="w-full"><Download className="h-4 w-4 mr-1" />Download Collage</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PhotoCollagePage;
