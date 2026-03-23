import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Droplets, Upload } from "lucide-react";

const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

const ImageWatermarkPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("Watermark");
  const [opacity, setOpacity] = useState(30);
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState("center");
  const [rotation, setRotation] = useState(-30);
  const [tiled, setTiled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  useEffect(() => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = preview;
  }, [preview]);

  useEffect(() => { draw(); }, [watermarkText, opacity, fontSize, color, position, rotation, tiled]);

  const draw = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = opacity / 100;
    ctx.fillStyle = color;
    const fs = (fontSize / 36) * (img.width / 16);
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (tiled) {
      const gap = fs * 4;
      for (let y = -img.height; y < img.height * 2; y += gap) {
        for (let x = -img.width; x < img.width * 2; x += gap) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }
    } else {
      let x = img.width / 2, y = img.height / 2;
      if (position === "top-left") { x = fs * 2; y = fs; }
      if (position === "top-right") { x = img.width - fs * 2; y = fs; }
      if (position === "bottom-left") { x = fs * 2; y = img.height - fs; }
      if (position === "bottom-right") { x = img.width - fs * 2; y = img.height - fs; }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(watermarkText, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = "watermarked.png";
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Image Watermark</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Upload image"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {preview && (
          <div className="space-y-3">
            <div><Label>Watermark Text</Label><Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} /></div>
            <div><Label>Opacity: {opacity}%</Label><Slider value={[opacity]} onValueChange={v => setOpacity(v[0])} min={5} max={100} /></div>
            <div><Label>Font Size: {fontSize}</Label><Slider value={[fontSize]} onValueChange={v => setFontSize(v[0])} min={12} max={96} /></div>
            <div><Label>Rotation: {rotation}°</Label><Slider value={[rotation]} onValueChange={v => setRotation(v[0])} min={-180} max={180} /></div>
            <div className="flex gap-3 items-end">
              <div><Label>Color</Label><input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
              <div className="flex-1"><Label>Position</Label>
                <Select value={position} onValueChange={setPosition}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={tiled} onChange={e => setTiled(e.target.checked)} className="rounded" /> Tiled / Repeat
            </label>
            <div className="flex justify-center"><canvas ref={canvasRef} className="max-w-full max-h-72 rounded-lg border border-border" /></div>
            <Button variant="outline" onClick={download} className="w-full"><Download className="h-4 w-4 mr-1" />Download</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageWatermarkPage;
