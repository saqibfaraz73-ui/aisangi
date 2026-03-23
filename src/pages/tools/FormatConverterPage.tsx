import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ArrowLeftRight, Upload } from "lucide-react";

const FORMATS = [
  { value: "image/png", label: "PNG", ext: "png" },
  { value: "image/jpeg", label: "JPG", ext: "jpg" },
  { value: "image/webp", label: "WebP", ext: "webp" },
  { value: "image/bmp", label: "BMP", ext: "bmp" },
];

const FormatConverterPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState("image/png");
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const convert = () => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      if (targetFormat === "image/jpeg" || targetFormat === "image/bmp") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0);
      setResult(c.toDataURL(targetFormat, 0.95));
    };
    img.src = preview;
  };

  const ext = FORMATS.find(f => f.value === targetFormat)?.ext || "png";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" /> Image Format Converter</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Click to upload"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {file && (
          <div className="space-y-3">
            <div><Label>Convert to</Label>
              <Select value={targetFormat} onValueChange={setTargetFormat}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={convert} className="w-full">Convert</Button>
          </div>
        )}
        {result && (
          <div className="text-center space-y-3">
            <img src={result} alt="Converted" className="max-h-64 mx-auto rounded-lg border border-border" />
            <Button variant="outline" asChild><a href={result} download={`converted.${ext}`}><Download className="h-4 w-4 mr-1" />Download {ext.toUpperCase()}</a></Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FormatConverterPage;
