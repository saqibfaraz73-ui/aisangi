import AppHeader from "@/components/AppHeader";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { Download, Trash2, Upload, Copy, PenTool, FileText, Image as ImageIcon, Undo2, Palette } from "lucide-react";
import jsPDF from "jspdf";

const COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Blue", value: "#1a3a8a" },
  { label: "Dark Blue", value: "#0d1b5e" },
  { label: "Red", value: "#b91c1c" },
  { label: "Green", value: "#166534" },
];

const DigitalSignaturePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Overlay state
  const [overlayTab, setOverlayTab] = useState("draw");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; type: "image" | "pdf"; name: string } | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [sigPosition, setSigPosition] = useState({ x: 50, y: 80 });
  const [sigScale, setSigScale] = useState(30); // percentage width
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 900;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 200);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-19), data]);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    saveHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    updateSignatureDataUrl();
  };

  const updateSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Create trimmed transparent PNG
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (imgData.data[i] < 250 || imgData.data[i + 1] < 250 || imgData.data[i + 2] < 250) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX <= minX || maxY <= minY) {
      setSignatureDataUrl(null);
      return;
    }
    const pad = 10;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const trimCanvas = document.createElement("canvas");
    trimCanvas.width = w;
    trimCanvas.height = h;
    const tCtx = trimCanvas.getContext("2d")!;
    // Make transparent background
    const srcData = ctx.getImageData(minX - pad, minY - pad, w, h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      if (srcData.data[i] >= 250 && srcData.data[i + 1] >= 250 && srcData.data[i + 2] >= 250) {
        srcData.data[i + 3] = 0;
      }
    }
    tCtx.putImageData(srcData, 0, 0);
    setSignatureDataUrl(trimCanvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
    setHistory([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));
    updateSignatureDataUrl();
  };

  const saveAsImage = () => {
    if (!signatureDataUrl) return;
    const a = document.createElement("a");
    a.href = signatureDataUrl;
    a.download = "signature.png";
    a.click();
    toast({ title: "Signature saved as PNG" });
  };

  const saveAsPdf = () => {
    if (!signatureDataUrl) return;
    const img = new window.Image();
    img.onload = () => {
      const pdf = new jsPDF({ orientation: img.width > img.height ? "landscape" : "portrait", unit: "px", format: [img.width + 40, img.height + 40] });
      pdf.addImage(signatureDataUrl!, "PNG", 20, 20, img.width, img.height);
      pdf.save("signature.pdf");
      toast({ title: "Signature saved as PDF" });
    };
    img.src = signatureDataUrl;
  };

  const copyToClipboard = async () => {
    if (!signatureDataUrl) return;
    try {
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast({ title: "Signature copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Your browser may not support image clipboard", variant: "destructive" });
    }
  };

  // --- Overlay / Place on Document ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) {
      toast({ title: "Unsupported file", description: "Please upload an image or PDF", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    if (isImg) {
      const img = new window.Image();
      img.onload = () => {
        setOverlayImage(img);
        setUploadedFile({ url, type: "image", name: file.name });
        setSigPosition({ x: 50, y: 80 });
      };
      img.src = url;
    } else {
      // For PDF, render first page as image using canvas
      import("pdfjs-dist").then(async (pdfjsLib) => {
        const workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const c = document.createElement("canvas");
        c.width = viewport.width;
        c.height = viewport.height;
        const cCtx = c.getContext("2d")!;
        await page.render({ canvasContext: cCtx, viewport, canvas: c } as any).promise;
        const img = new window.Image();
        img.onload = () => {
          setOverlayImage(img);
          setUploadedFile({ url, type: "pdf", name: file.name });
          setSigPosition({ x: 50, y: 80 });
        };
        img.src = c.toDataURL();
      });
    }
    e.target.value = "";
  };

  // Draw overlay preview
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !overlayImage || !signatureDataUrl) return;
    const ctx = canvas.getContext("2d")!;
    const maxW = Math.min(800, window.innerWidth - 40);
    const ratio = overlayImage.height / overlayImage.width;
    canvas.width = maxW;
    canvas.height = maxW * ratio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);

    // Draw signature
    const sigImg = new window.Image();
    sigImg.onload = () => {
      const sigW = (canvas.width * sigScale) / 100;
      const sigH = sigW * (sigImg.height / sigImg.width);
      const sx = (canvas.width * sigPosition.x) / 100 - sigW / 2;
      const sy = (canvas.height * sigPosition.y) / 100 - sigH / 2;
      ctx.drawImage(sigImg, sx, sy, sigW, sigH);
      // Draw border
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sigW, sigH);
      ctx.setLineDash([]);
    };
    sigImg.src = signatureDataUrl;
  }, [overlayImage, signatureDataUrl, sigPosition, sigScale]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  const handleOverlayMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: ((clientX - rect.left) / rect.width) * 100 - sigPosition.x,
      y: ((clientY - rect.top) / rect.height) * 100 - sigPosition.y,
    };
  };

  const handleOverlayMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
    const y = ((clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;
    setSigPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleOverlayMouseUp = () => setIsDragging(false);

  const exportOverlay = (format: "png" | "pdf") => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !overlayImage || !signatureDataUrl) return;
    // Render full resolution
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = overlayImage.width;
    fullCanvas.height = overlayImage.height;
    const ctx = fullCanvas.getContext("2d")!;
    ctx.drawImage(overlayImage, 0, 0);
    const sigImg = new window.Image();
    sigImg.onload = () => {
      const sigW = (fullCanvas.width * sigScale) / 100;
      const sigH = sigW * (sigImg.height / sigImg.width);
      const sx = (fullCanvas.width * sigPosition.x) / 100 - sigW / 2;
      const sy = (fullCanvas.height * sigPosition.y) / 100 - sigH / 2;
      ctx.drawImage(sigImg, sx, sy, sigW, sigH);
      if (format === "png") {
        const a = document.createElement("a");
        a.href = fullCanvas.toDataURL("image/png");
        a.download = "signed-document.png";
        a.click();
        toast({ title: "Signed document saved as PNG" });
      } else {
        const w = fullCanvas.width;
        const h = fullCanvas.height;
        const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h] });
        pdf.addImage(fullCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
        pdf.save("signed-document.pdf");
        toast({ title: "Signed document saved as PDF" });
      }
    };
    sigImg.src = signatureDataUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
          <PenTool className="h-6 w-6 text-primary" /> Digital Signature
        </h1>

        <Tabs value={overlayTab} onValueChange={setOverlayTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="draw">Draw Signature</TabsTrigger>
            <TabsTrigger value="place" disabled={!hasSignature}>Place on Document</TabsTrigger>
          </TabsList>

          <TabsContent value="draw">
            <Card className="p-4 space-y-4">
              {/* Pen controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setPenColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${penColor === c.value ? "border-primary scale-110" : "border-border"}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-xs text-muted-foreground">Size</span>
                  <Slider min={1} max={8} step={1} value={[penSize]} onValueChange={([v]) => setPenSize(v)} className="w-24" />
                </div>
                <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}><Undo2 className="h-4 w-4 mr-1" />Undo</Button>
                <Button variant="outline" size="sm" onClick={clearCanvas}><Trash2 className="h-4 w-4 mr-1" />Clear</Button>
              </div>

              {/* Canvas */}
              <div className="border border-border rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair"
                  style={{ maxHeight: 200, aspectRatio: "3/1" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Draw your signature above using mouse or touch</p>

              {/* Actions */}
              {hasSignature && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" onClick={saveAsImage}><ImageIcon className="h-4 w-4 mr-1" />Save PNG</Button>
                  <Button size="sm" onClick={saveAsPdf}><FileText className="h-4 w-4 mr-1" />Save PDF</Button>
                  <Button size="sm" variant="outline" onClick={copyToClipboard}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                  <Button size="sm" variant="secondary" onClick={() => setOverlayTab("place")}>
                    <Upload className="h-4 w-4 mr-1" />Place on Document
                  </Button>
                </div>
              )}

              {/* Preview */}
              {signatureDataUrl && (
                <div className="flex justify-center">
                  <div className="border border-dashed border-border rounded-lg p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Preview (transparent background)</p>
                    <img src={signatureDataUrl} alt="Signature preview" className="max-h-16" style={{ imageRendering: "auto" }} />
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="place">
            <Card className="p-4 space-y-4">
              {!uploadedFile ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-3">Upload a PDF or image to place your signature on it</p>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Upload Document</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">📄 {uploadedFile.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Signature size</span>
                      <Slider min={5} max={60} step={1} value={[sigScale]} onValueChange={([v]) => setSigScale(v)} className="w-32" />
                      <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); setOverlayImage(null); }}>
                        <Trash2 className="h-4 w-4 mr-1" />Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Drag the signature to position it on the document</p>
                  <div className="border border-border rounded-lg overflow-auto bg-white max-h-[70vh]">
                    <canvas
                      ref={overlayCanvasRef}
                      className="w-full cursor-move touch-none"
                      onMouseDown={handleOverlayMouseDown}
                      onMouseMove={handleOverlayMouseMove}
                      onMouseUp={handleOverlayMouseUp}
                      onMouseLeave={handleOverlayMouseUp}
                      onTouchStart={handleOverlayMouseDown}
                      onTouchMove={handleOverlayMouseMove}
                      onTouchEnd={handleOverlayMouseUp}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button size="sm" onClick={() => exportOverlay("png")}><ImageIcon className="h-4 w-4 mr-1" />Export PNG</Button>
                    <Button size="sm" onClick={() => exportOverlay("pdf")}><FileText className="h-4 w-4 mr-1" />Export PDF</Button>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DigitalSignaturePage;
