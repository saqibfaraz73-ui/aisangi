import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, Type, Upload } from "lucide-react";

const MemeGeneratorPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [topText, setTopText] = useState("TOP TEXT");
  const [bottomText, setBottomText] = useState("BOTTOM TEXT");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
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
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = preview;
  }, [preview]);

  useEffect(() => { draw(); }, [topText, bottomText, fontSize, textColor, strokeColor]);

  const draw = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const fs = (fontSize / 48) * (img.width / 12);
    ctx.font = `bold ${fs}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = fs / 12;
    ctx.lineJoin = "round";

    if (topText) {
      ctx.strokeText(topText.toUpperCase(), img.width / 2, fs + 20);
      ctx.fillText(topText.toUpperCase(), img.width / 2, fs + 20);
    }
    if (bottomText) {
      ctx.strokeText(bottomText.toUpperCase(), img.width / 2, img.height - 20);
      ctx.fillText(bottomText.toUpperCase(), img.width / 2, img.height - 20);
    }
  };

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = "meme.png";
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><Type className="h-5 w-5 text-primary" /> Meme Generator</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Upload an image"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {preview && (
          <div className="space-y-3">
            <div><Label>Top Text</Label><Input value={topText} onChange={e => setTopText(e.target.value)} /></div>
            <div><Label>Bottom Text</Label><Input value={bottomText} onChange={e => setBottomText(e.target.value)} /></div>
            <div><Label>Font Size: {fontSize}</Label><Slider value={[fontSize]} onValueChange={v => setFontSize(v[0])} min={16} max={96} /></div>
            <div className="flex gap-3">
              <div><Label>Text Color</Label><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
              <div><Label>Stroke</Label><input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
            </div>
            <div className="flex justify-center"><canvas ref={canvasRef} className="max-w-full max-h-80 rounded-lg border border-border" /></div>
            <Button variant="outline" onClick={download} className="w-full"><Download className="h-4 w-4 mr-1" />Download Meme</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MemeGeneratorPage;
