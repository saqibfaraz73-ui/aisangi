import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ScanText, Upload, Camera, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

const ImageToTextPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setText("");
    const url = URL.createObjectURL(f);
    setPreview(url);
    setProcessing(true);
    setProgress(0);
    try {
      const result = await Tesseract.recognize(url, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      setText(result.data.text.trim());
      if (!result.data.text.trim()) toast.error("No text found in image");
    } catch (e) {
      console.error("OCR failed", e);
      toast.error("Failed to extract text");
    }
    setProcessing(false);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" /> Image to Text (OCR)
        </h2>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Upload Image
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4 mr-1" /> Use Camera
          </Button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {preview && (
          <div className="flex justify-center">
            <img src={preview} alt="Uploaded" className="max-w-full max-h-60 rounded-lg border border-border object-contain" />
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Extracting text… {progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {text && !processing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Extracted Text</span>
              <Button size="sm" variant="outline" onClick={copyText}>
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy All"}
              </Button>
            </div>
            <div
              className="p-4 rounded-lg border border-border bg-card text-sm text-foreground whitespace-pre-wrap select-all min-h-[100px] max-h-[300px] overflow-y-auto"
            >
              {text}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageToTextPage;
