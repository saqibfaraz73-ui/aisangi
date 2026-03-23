import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, Layers, Upload, Loader2 } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";

const TextBehindImagePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [fgUrl, setFgUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [text, setText] = useState("HELLO");
  const [fontSize, setFontSize] = useState(120);
  const [textColor, setTextColor] = useState("#ff0000");
  const [textY, setTextY] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setFgUrl(null);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    setProcessing(true);
    try {
      const blob = await removeBackground(url, { output: { format: "image/png" } });
      setFgUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error("BG removal failed", e);
    }
    setProcessing(false);
  };

  useEffect(() => { draw(); }, [originalUrl, fgUrl, text, fontSize, textColor, textY]);

  const draw = () => {
    const c = canvasRef.current;
    if (!c || !originalUrl) return;
    const bgImg = new Image();
    bgImg.onload = () => {
      c.width = bgImg.width; c.height = bgImg.height;
      const ctx = c.getContext("2d")!;
      // Draw background
      ctx.drawImage(bgImg, 0, 0);
      // Draw text in middle layer
      const fs = (fontSize / 100) * (bgImg.width / 8);
      ctx.font = `bold ${fs}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.fillText(text, bgImg.width / 2, bgImg.height * (textY / 100));
      // Draw foreground (subject) on top
      if (fgUrl) {
        const fgImg = new Image();
        fgImg.onload = () => {
          ctx.drawImage(fgImg, 0, 0, bgImg.width, bgImg.height);
        };
        fgImg.src = fgUrl;
      }
    };
    bgImg.src = originalUrl;
  };

  const download = () => {
    if (!canvasRef.current) return;
    // Re-draw synchronously and download
    setTimeout(() => {
      const a = document.createElement("a");
      a.download = "text-behind.png";
      a.href = canvasRef.current!.toDataURL("image/png");
      a.click();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Text Behind Image</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Upload a photo with a clear subject"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {processing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Removing background...</span>
          </div>
        )}
        {originalUrl && !processing && (
          <div className="space-y-3">
            <div><Label>Text</Label><Input value={text} onChange={e => setText(e.target.value)} /></div>
            <div><Label>Font Size: {fontSize}</Label><Slider value={[fontSize]} onValueChange={v => setFontSize(v[0])} min={20} max={300} /></div>
            <div><Label>Vertical Position: {textY}%</Label><Slider value={[textY]} onValueChange={v => setTextY(v[0])} min={10} max={90} /></div>
            <div><Label>Text Color</Label><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
            <div className="flex justify-center"><canvas ref={canvasRef} className="max-w-full max-h-80 rounded-lg border border-border" /></div>
            <Button variant="outline" onClick={download} className="w-full"><Download className="h-4 w-4 mr-1" />Download</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default TextBehindImagePage;
