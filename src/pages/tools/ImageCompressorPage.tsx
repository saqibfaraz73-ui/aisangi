import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileDown, Upload } from "lucide-react";

const ImageCompressorPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState(70);
  const [format, setFormat] = useState("image/jpeg");
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const compress = () => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      c.toBlob(
        blob => {
          if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size });
        },
        format,
        quality / 100
      );
    };
    img.src = preview;
  };

  const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><FileDown className="h-5 w-5 text-primary" /> Image Compressor</h2>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Click to upload an image"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {file && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Original: {(file.size / 1024).toFixed(1)} KB</p>
            <div><Label>Output Format</Label>
              <Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                  <SelectItem value="image/webp">WebP</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quality: {quality}%</Label>
              <Slider value={[quality]} onValueChange={v => setQuality(v[0])} min={10} max={100} step={5} />
            </div>
            <Button onClick={compress} className="w-full">Compress</Button>
          </div>
        )}
        {result && (
          <div className="space-y-3 text-center">
            <img src={result.url} alt="Compressed" className="max-h-64 mx-auto rounded-lg border border-border" />
            <p className="text-sm text-muted-foreground">Compressed: {(result.size / 1024).toFixed(1)} KB ({Math.round((1 - result.size / file!.size) * 100)}% smaller)</p>
            <Button variant="outline" asChild><a href={result.url} download={`compressed.${ext}`}><Download className="h-4 w-4 mr-1" />Download</a></Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageCompressorPage;
