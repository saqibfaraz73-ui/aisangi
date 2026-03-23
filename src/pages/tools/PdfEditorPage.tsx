import { useState, useRef, useCallback, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, FileText, RotateCw, Trash2, Plus, Download, Type,
  ChevronLeft, ChevronRight, MoveUp, MoveDown, FilePlus, Merge
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PageInfo {
  pageNum: number;
  rotation: number;
  deleted: boolean;
  thumbnail?: string;
}

interface TextAnnotation {
  page: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

const PdfEditorPage = () => {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [addingText, setAddingText] = useState(false);
  const [newText, setNewText] = useState("Sample text");
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#000000");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [mergePdfs, setMergePdfs] = useState<{ name: string; bytes: ArrayBuffer }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadPdf = useCallback(async (buffer: ArrayBuffer) => {
    const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    const pageInfos: PageInfo[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: vp, canvas } as any).promise;
      pageInfos.push({
        pageNum: i,
        rotation: 0,
        deleted: false,
        thumbnail: canvas.toDataURL(),
      });
    }
    setPages(pageInfos);
    setSelectedPage(0);
    setAnnotations([]);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setLoading(true);
    const buffer = await file.arrayBuffer();
    setPdfBytes(buffer);
    setFileName(file.name);
    await loadPdf(buffer);
    setLoading(false);
    toast.success(`Loaded ${file.name}`);
  };

  // Render selected page preview
  useEffect(() => {
    if (!pdfBytes || pages.length === 0) return;
    const renderPreview = async () => {
      const activePages = pages.filter((p) => !p.deleted);
      if (activePages.length === 0 || selectedPage >= activePages.length) return;
      const pageInfo = activePages[selectedPage];
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      const page = await pdf.getPage(pageInfo.pageNum);
      const totalRotation = (page.rotate + pageInfo.rotation) % 360;
      const vp = page.getViewport({ scale: 1.2, rotation: totalRotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas: canvasRef.current! } as any).promise;

      // Draw annotations for this page
      const pageAnnotations = annotations.filter((a) => a.page === pageInfo.pageNum);
      pageAnnotations.forEach((ann) => {
        ctx.font = `${ann.fontSize * 1.2}px Helvetica`;
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.x * 1.2, ann.y * 1.2);
      });
    };
    renderPreview();
  }, [pdfBytes, pages, selectedPage, annotations]);

  const rotatePage = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deletePage = (idx: number) => {
    setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, deleted: !p.deleted } : p)));
  };

  const movePage = (idx: number, dir: -1 | 1) => {
    setPages((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!addingText || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX / 1.2;
    const y = (e.clientY - rect.top) * scaleY / 1.2;
    const activePages = pages.filter((p) => !p.deleted);
    if (activePages.length === 0) return;
    const pageNum = activePages[selectedPage].pageNum;
    setAnnotations((prev) => [
      ...prev,
      { page: pageNum, text: newText, x, y, fontSize, color: textColor },
    ]);
    setAddingText(false);
    toast.success("Text added — click Download to save");
  };

  const handleMergeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(async (f) => {
      if (f.type !== "application/pdf") return;
      const buf = await f.arrayBuffer();
      setMergePdfs((prev) => [...prev, { name: f.name, bytes: buf }]);
    });
  };

  const doMerge = async () => {
    if (!pdfBytes && mergePdfs.length < 2) {
      toast.error("Need at least 2 PDFs to merge");
      return;
    }
    setLoading(true);
    try {
      const merged = await PDFDocument.create();
      const allPdfs = pdfBytes ? [{ name: fileName, bytes: pdfBytes }, ...mergePdfs] : mergePdfs;
      for (const item of allPdfs) {
        const src = await PDFDocument.load(item.bytes);
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      }
      const resultBytes = await merged.save();
      const blob = new Blob([resultBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDFs merged & downloaded!");
      setMergePdfs([]);
    } catch (err) {
      toast.error("Merge failed");
    }
    setLoading(false);
  };

  const downloadEdited = async () => {
    if (!pdfBytes) return;
    setLoading(true);
    try {
      const doc = await PDFDocument.load(pdfBytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const activePages = pages.filter((p) => !p.deleted);
      const deletedNums = new Set(pages.filter((p) => p.deleted).map((p) => p.pageNum));

      // Remove deleted pages (in reverse order)
      const allPageIndices = doc.getPageIndices();
      for (let i = allPageIndices.length - 1; i >= 0; i--) {
        if (deletedNums.has(i + 1)) {
          doc.removePage(i);
        }
      }

      // Now reorder remaining pages to match activePages order
      // Apply rotations and annotations
      const currentPages = doc.getPages();
      activePages.forEach((pi, idx) => {
        if (idx < currentPages.length) {
          const page = currentPages[idx];
          if (pi.rotation !== 0) {
            page.setRotation({ type: "degrees" as any, angle: pi.rotation } as any);
          }
          // Add text annotations
          const pageAnns = annotations.filter((a) => a.page === pi.pageNum);
          const { height } = page.getSize();
          pageAnns.forEach((ann) => {
            const hexToRgb = (hex: string) => {
              const r = parseInt(hex.slice(1, 3), 16) / 255;
              const g = parseInt(hex.slice(3, 5), 16) / 255;
              const b = parseInt(hex.slice(5, 7), 16) / 255;
              return rgb(r, g, b);
            };
            page.drawText(ann.text, {
              x: ann.x,
              y: height - ann.y,
              size: ann.fontSize,
              font,
              color: hexToRgb(ann.color),
            });
          });
        }
      });

      const resultBytes = await doc.save();
      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(".pdf", "_edited.pdf");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Edited PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    }
    setLoading(false);
  };

  const activePages = pages.filter((p) => !p.deleted);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> PDF Reader & Editor
        </h2>

        {!pdfBytes ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Upload a PDF to view & edit</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {activePages.length} page{activePages.length !== 1 ? "s" : ""}
              </span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { setPdfBytes(null); setPages([]); setAnnotations([]); setMergePdfs([]); }}>
                New PDF
              </Button>
              <Button size="sm" onClick={downloadEdited} disabled={loading}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
              {/* Thumbnail sidebar */}
              <ScrollArea className="h-[500px] border border-border rounded-lg p-2">
                <div className="space-y-2">
                  {pages.map((p, i) => (
                    <div
                      key={i}
                      className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                        p.deleted
                          ? "opacity-30 border-destructive"
                          : selectedPage === pages.filter((pp) => !pp.deleted).indexOf(p)
                          ? "border-primary shadow-glow"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => {
                        if (!p.deleted) {
                          const activeIdx = pages.filter((pp) => !pp.deleted).indexOf(p);
                          setSelectedPage(activeIdx);
                        }
                      }}
                    >
                      {p.thumbnail && (
                        <img
                          src={p.thumbnail}
                          alt={`Page ${p.pageNum}`}
                          className="w-full rounded-md"
                          style={{ transform: `rotate(${p.rotation}deg)` }}
                        />
                      )}
                      <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">
                        {p.pageNum}
                      </span>
                      <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); rotatePage(i); }}
                          className="p-0.5 rounded bg-background/80 hover:bg-primary/20"
                          title="Rotate"
                        >
                          <RotateCw className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                          className="p-0.5 rounded bg-background/80 hover:bg-destructive/20"
                          title={p.deleted ? "Restore" : "Delete"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); movePage(i, -1); }}
                          className="p-0.5 rounded bg-background/80 hover:bg-primary/20"
                          title="Move up"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); movePage(i, 1); }}
                          className="p-0.5 rounded bg-background/80 hover:bg-primary/20"
                          title="Move down"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Main preview */}
              <div className="space-y-3">
                <div className="border border-border rounded-lg overflow-auto bg-muted/30 flex items-center justify-center min-h-[400px]">
                  <canvas
                    ref={canvasRef}
                    className={`max-w-full ${addingText ? "cursor-crosshair" : ""}`}
                    onClick={handleCanvasClick}
                  />
                </div>

                {/* Page navigation */}
                {activePages.length > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedPage === 0}
                      onClick={() => setSelectedPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedPage + 1} / {activePages.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedPage >= activePages.length - 1}
                      onClick={() => setSelectedPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Text annotation controls */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Type className="h-4 w-4 text-primary" /> Add Text
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter text"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Size</Label>
                      <Input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        min={8}
                        max={72}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="w-16">
                      <Label className="text-xs">Color</Label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={addingText ? "default" : "outline"}
                      onClick={() => setAddingText(!addingText)}
                    >
                      {addingText ? "Click on page…" : "Place Text"}
                    </Button>
                  </div>
                  {annotations.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => setAnnotations([])}
                    >
                      Clear all annotations ({annotations.length})
                    </Button>
                  )}
                </div>

                {/* Merge PDFs section */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Merge className="h-4 w-4 text-primary" /> Merge PDFs
                  </p>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button size="sm" variant="outline" onClick={() => mergeInputRef.current?.click()}>
                      <FilePlus className="h-4 w-4 mr-1" /> Add PDFs
                    </Button>
                    <input
                      ref={mergeInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={handleMergeUpload}
                    />
                    {mergePdfs.map((m, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        {m.name}
                        <button onClick={() => setMergePdfs((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {mergePdfs.length > 0 && (
                      <Button size="sm" onClick={doMerge} disabled={loading}>
                        <Download className="h-4 w-4 mr-1" /> Merge & Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
};

export default PdfEditorPage;
