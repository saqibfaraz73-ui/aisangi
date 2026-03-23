import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Download, FileText, Upload, X } from "lucide-react";
import jsPDF from "jspdf";

const ScreenshotToPdfPage = () => {
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = () => setImages(prev => [...prev, { url: r.result as string, name: f.name }]);
      r.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const generatePdf = async () => {
    if (images.length === 0) return;
    const pdf = new jsPDF();
    for (let i = 0; i < images.length; i++) {
      if (i > 0) pdf.addPage();
      const img = new Image();
      await new Promise<void>(resolve => {
        img.onload = () => {
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const scale = Math.min(pageW / img.width, pageH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (pageW - w) / 2;
          const y = (pageH - h) / 2;
          pdf.addImage(img.src, "JPEG", x, y, w, h);
          resolve();
        };
        img.src = images[i].url;
      });
    }
    pdf.save("screenshots.pdf");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Screenshot to PDF</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Upload images (select multiple)</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
        </div>
        {images.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.url} alt={img.name} className="rounded-lg border border-border w-full h-24 object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">{i + 1}</span>
                </div>
              ))}
            </div>
            <Button onClick={generatePdf} className="w-full"><Download className="h-4 w-4 mr-1" />Generate PDF ({images.length} page{images.length > 1 ? "s" : ""})</Button>
          </>
        )}
      </main>
    </div>
  );
};

export default ScreenshotToPdfPage;
