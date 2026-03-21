import { useState, useRef, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import PosterCanvas from "@/components/poster/PosterCanvas";
import ElementEditor from "@/components/poster/ElementEditor";
import { POSTER_TEMPLATES } from "@/components/poster/templates";
import { POSTER_SIZES, PosterSize, TemplateElement } from "@/components/poster/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Image as ImageIcon, Palette, Plus, Type, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SIZE_CATEGORIES = [...new Set(POSTER_SIZES.map((s) => s.category))];
const TEMPLATE_CATEGORIES = [...new Set(POSTER_TEMPLATES.map((t) => t.category))];

let nextElId = 100;

export default function PosterGeneratorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(POSTER_TEMPLATES[0]);
  const [elements, setElements] = useState<TemplateElement[]>(POSTER_TEMPLATES[0].elements);
  const [selectedSize, setSelectedSize] = useState<PosterSize>(POSTER_SIZES[0]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({});
  const [bgColor, setBgColor] = useState(POSTER_TEMPLATES[0].bgColor);
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [sizeCategory, setSizeCategory] = useState(SIZE_CATEGORIES[0]);
  const [templateCategory, setTemplateCategory] = useState(TEMPLATE_CATEGORIES[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);

  const selectTemplate = (t: typeof POSTER_TEMPLATES[0]) => {
    setSelectedTemplate(t);
    setElements([...t.elements]);
    setBgColor(t.bgColor);
    setSelectedElement(null);
    setUploadedPhotos({});
  };

  const updateElement = useCallback((id: string, updates: Partial<TemplateElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  }, []);

  const addTextElement = () => {
    const id = `custom-text-${nextElId++}`;
    const newEl: TemplateElement = {
      id,
      type: "text",
      x: 10,
      y: 50,
      width: 80,
      height: 15,
      text: "Your Text Here",
      fontFamily: "Inter",
      fontSize: 3,
      fontWeight: "normal",
      color: "#FFFFFF",
      textAlign: "center",
      direction: "ltr",
      editable: true,
      lineHeight: 1.4,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElement(id);
    toast.success("Text element added!");
  };

  const addImageElement = () => {
    const id = `custom-photo-${nextElId++}`;
    const newEl: TemplateElement = {
      id,
      type: "image",
      x: 20,
      y: 20,
      width: 30,
      height: 30,
      editable: true,
      isPhoto: true,
      borderRadius: 0,
      bgColor: "rgba(255,255,255,0.1)",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElement(id);
    toast.success("Photo slot added!");
  };

  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
    setUploadedPhotos((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success("Element removed");
  };

  const handleUploadPhoto = (elementId: string) => {
    setPendingPhotoId(elementId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPhotoId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedPhotos((prev) => ({ ...prev, [pendingPhotoId!]: ev.target?.result as string }));
      setPendingPhotoId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const exportPoster = async (format: "png" | "jpg") => {
    const canvas = document.createElement("canvas");
    canvas.width = selectedSize.width;
    canvas.height = selectedSize.height;
    const ctx = canvas.getContext("2d")!;
    const pw = selectedSize.width;
    const ph = selectedSize.height;

    const tmpl = { ...selectedTemplate, bgColor };
    if (tmpl.bgGradient) {
      const colorMatches = tmpl.bgGradient.match(/#[0-9a-fA-F]{6}/g);
      if (colorMatches && colorMatches.length >= 2) {
        const g = ctx.createLinearGradient(0, 0, pw, ph);
        colorMatches.forEach((c, i) => g.addColorStop(i / (colorMatches.length - 1), c));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = bgColor;
      }
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, pw, ph);

    const photoImages: Record<string, HTMLImageElement> = {};
    await Promise.all(
      Object.entries(uploadedPhotos).map(([id, url]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => { photoImages[id] = img; resolve(); };
          img.onerror = () => resolve();
          img.src = url;
        })
      )
    );

    for (const el of elements) {
      const x = (el.x / 100) * pw;
      const y = (el.y / 100) * ph;
      const w = (el.width / 100) * pw;
      const h = (el.height / 100) * ph;

      if (el.type === "rect") {
        ctx.fillStyle = el.bgColor || "#333";
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      } else if (el.type === "circle") {
        ctx.fillStyle = el.bgColor || "#333";
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (el.type === "image") {
        const img = photoImages[el.id];
        if (img) {
          ctx.save();
          if (el.borderRadius === 50) {
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.clip();
          }
          const imgRatio = img.width / img.height;
          const boxRatio = w / h;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgRatio > boxRatio) { sw = img.height * boxRatio; sx = (img.width - sw) / 2; }
          else { sh = img.width / boxRatio; sy = (img.height - sh) / 2; }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
          ctx.restore();
        }
      } else if (el.type === "text" && el.text) {
        const fontSize = ((el.fontSize || 3) / 100) * ph;
        ctx.font = `${el.fontWeight || "normal"} ${fontSize}px "${el.fontFamily || "Inter"}", sans-serif`;
        ctx.fillStyle = el.color || "#FFFFFF";
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.textBaseline = "top";
        if (el.direction === "rtl") ctx.direction = "rtl"; else ctx.direction = "ltr";
        const align = el.textAlign || "center";
        let tx = x;
        if (align === "center") { ctx.textAlign = "center"; tx = x + w / 2; }
        else if (align === "right") { ctx.textAlign = "right"; tx = x + w; }
        else { ctx.textAlign = "left"; }
        const lines = el.text.split("\n");
        const lh = fontSize * (el.lineHeight || 1.4);
        lines.forEach((line, i) => ctx.fillText(line, tx, y + i * lh));
        ctx.direction = "ltr";
        ctx.globalAlpha = 1;
      }
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `poster-${selectedSize.label.replace(/\s/g, "-")}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Poster downloaded as ${format.toUpperCase()}!`);
      },
      format === "jpg" ? "image/jpeg" : "image/png",
      0.95
    );
  };

  const currentElement = elements.find((e) => e.id === selectedElement);
  const filteredTemplates = POSTER_TEMPLATES.filter((t) => t.category === templateCategory);
  const filteredSizes = sizeCategory === "Custom"
    ? []
    : POSTER_SIZES.filter((s) => s.category === sizeCategory);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppHeader />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <main className="max-w-7xl mx-auto p-3 sm:p-4 overflow-x-hidden">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-display font-bold text-foreground flex items-center justify-center gap-2">
            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            پوسٹر جنریٹر / Poster Generator
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            اردو فونٹس کے ساتھ ریڈی میڈ ٹیمپلیٹس — سیاسی، کاروباری، تقریبات
          </p>
        </div>

        {/* Canvas Preview - mobile */}
        <div className="flex flex-col items-center gap-3 mb-4 lg:hidden overflow-hidden">
          <div className="text-xs text-muted-foreground">
            {selectedSize.label} — {selectedSize.width} × {selectedSize.height} px
          </div>
          <div className="w-full flex justify-center overflow-hidden">
            <PosterCanvas
              template={{ ...selectedTemplate, bgColor }}
              size={selectedSize}
              elements={elements}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              uploadedPhotos={uploadedPhotos}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => exportPoster("png")} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportPoster("jpg")} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> JPG
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Panel */}
          <div className="space-y-3 sm:space-y-4 min-w-0">
            {/* Template Selection */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">📋 Templates</h3>
              <Tabs value={templateCategory} onValueChange={setTemplateCategory}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="text-[10px] sm:text-xs px-2 sm:px-3">{cat}</TabsTrigger>
                  ))}
                </TabsList>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-2 sm:mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {filteredTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectTemplate(t)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            selectedTemplate.id === t.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <div
                            className="h-12 sm:h-16 rounded mb-1"
                            style={{ background: t.bgGradient || t.bgColor }}
                          />
                          <p className="text-[10px] sm:text-xs text-foreground truncate">{t.nameUrdu || t.name}</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{t.name}</p>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Size Selection */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">📐 Size</h3>
              <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                {[...SIZE_CATEGORIES, "Custom"].map((cat) => (
                  <Button
                    key={cat}
                    variant={sizeCategory === cat ? "default" : "outline"}
                    size="sm"
                    className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                    onClick={() => setSizeCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {sizeCategory === "Custom" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width (px)</Label>
                    <Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Height (px)</Label>
                    <Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value)} className="h-8" />
                  </div>
                  <Button
                    className="col-span-2 text-xs"
                    size="sm"
                    onClick={() => setSelectedSize({ label: `Custom ${customW}x${customH}`, width: customW, height: customH, category: "Custom" })}
                  >
                    Apply Custom Size
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredSizes.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSelectedSize(s)}
                      className={`w-full text-left px-3 py-1.5 sm:py-2 rounded text-xs transition-colors ${
                        selectedSize.label === s.label
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {s.label} ({s.width}×{s.height})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Background Color */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm sm:text-base">
                <Palette className="h-4 w-4" /> Background
              </h3>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 rounded border border-border cursor-pointer"
                />
                <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* Center - Canvas Preview (desktop only) */}
          <div className="hidden lg:flex flex-col items-center gap-4 min-w-0 overflow-hidden">
            <div className="text-xs text-muted-foreground">
              {selectedSize.label} — {selectedSize.width} × {selectedSize.height} px
            </div>
            <PosterCanvas
              template={{ ...selectedTemplate, bgColor }}
              size={selectedSize}
              elements={elements}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              uploadedPhotos={uploadedPhotos}
            />
            <div className="flex gap-2">
              <Button onClick={() => exportPoster("png")} className="gap-2">
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <Button variant="outline" onClick={() => exportPoster("jpg")} className="gap-2">
                <Download className="h-4 w-4" /> Download JPG
              </Button>
            </div>
          </div>

          {/* Right Panel - Element Editor */}
          <div className="space-y-3 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">✏️ Edit Elements</h3>

            {/* Add Custom Elements */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addTextElement} className="flex-1 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /><Type className="h-3.5 w-3.5" /> Add Text
              </Button>
              <Button size="sm" variant="outline" onClick={addImageElement} className="flex-1 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /><ImageIcon className="h-3.5 w-3.5" /> Add Image
              </Button>
            </div>

            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Click on poster or select below to edit. Use sliders to position.
            </p>
            
            {currentElement ? (
              <div className="space-y-2">
                <ElementEditor
                  element={currentElement}
                  onUpdate={updateElement}
                  onUploadPhoto={handleUploadPhoto}
                />
                {currentElement.id.startsWith("custom-") && (
                  <Button size="sm" variant="destructive" onClick={() => deleteElement(currentElement.id)} className="w-full gap-1.5 text-xs">
                    <Trash2 className="h-3.5 w-3.5" /> Remove Element
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground bg-card border border-border rounded-lg p-3 sm:p-4">
                👆 Click on a text or photo area in the poster to start editing
              </div>
            )}

            {/* All editable elements list */}
            <div className="space-y-1">
              <h4 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">All Elements</h4>
              {elements.filter((e) => e.editable).map((el) => (
                <div key={el.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedElement(el.id)}
                    className={`flex-1 text-left px-3 py-1.5 sm:py-2 rounded text-xs transition-colors truncate ${
                      selectedElement === el.id
                        ? "bg-primary/10 border border-primary text-foreground"
                        : "hover:bg-muted text-muted-foreground border border-transparent"
                    }`}
                  >
                    {el.type === "image" ? "📷 Photo" : "📝"} {el.text?.slice(0, 25) || el.id}
                  </button>
                  {el.id.startsWith("custom-") && (
                    <button
                      onClick={() => deleteElement(el.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
