import { useState, useRef, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Palette, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const ColorPickerPage = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      setPreview(r.result as string);
      setColors([]);
      setPicked(null);
    };
    r.readAsDataURL(f);
  };

  const drawImage = useCallback(() => {
    if (!canvasRef.current || !preview) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current!;
      const scale = Math.min(400 / img.width, 350 / img.height, 1);
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = preview;
  }, [preview]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    const [r, g, b] = c.getContext("2d")!.getImageData(x, y, 1, 1).data;
    const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
    setPicked(hex);
    if (!colors.includes(hex)) setColors(prev => [...prev.slice(-11), hex]);
  };

  const extractPalette = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const buckets: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const hex = `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
      buckets[hex] = (buckets[hex] || 0) + 1;
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex);
    setColors(sorted);
  };

  const copyColor = (hex: string, idx: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(idx);
    toast.success(`Copied ${hex}`);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToHsl = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Color Picker</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Upload image to pick colors</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
        {preview && (
          <>
            <div className="flex justify-center">
              <canvas ref={canvasRef} onClick={handleCanvasClick} onLoad={drawImage} className="rounded-lg border border-border cursor-crosshair" />
              <img src={preview} alt="" className="hidden" onLoad={drawImage} />
            </div>
            <Button variant="outline" onClick={extractPalette} className="w-full">Auto-Extract Palette</Button>
          </>
        )}
        {picked && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <div className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: picked }} />
            <div className="text-xs space-y-0.5">
              <p className="font-mono text-foreground">{picked}</p>
              <p className="text-muted-foreground">{hexToRgb(picked)}</p>
              <p className="text-muted-foreground">{hexToHsl(picked)}</p>
            </div>
          </div>
        )}
        {colors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Palette</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c, i) => (
                <button key={i} onClick={() => copyColor(c, i)} className="group relative h-12 w-12 rounded-lg border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }}>
                  {copiedIdx === i ? <Check className="h-4 w-4 text-white drop-shadow mx-auto" /> : <Copy className="h-3 w-3 text-white/0 group-hover:text-white drop-shadow mx-auto transition-colors" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ColorPickerPage;
