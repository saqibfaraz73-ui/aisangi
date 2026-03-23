import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, PenTool, Square, Circle, Minus, Triangle } from "lucide-react";

type Shape = {
  type: "rect" | "circle" | "line" | "triangle";
  x: number; y: number;
  w: number; h: number;
  fill: string; stroke: string; strokeWidth: number;
};

const SvgEditorPage = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Shape["type"]>("rect");
  const [fill, setFill] = useState("#6366f1");
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [canvasSize] = useState({ w: 500, h: 500 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);

  const getPos = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getPos(e);
    setDragging(true);
    setStartPos(pos);
    setCurrentShape({ type: tool, x: pos.x, y: pos.y, w: 0, h: 0, fill, stroke, strokeWidth });
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !currentShape) return;
    const pos = getPos(e);
    setCurrentShape({
      ...currentShape,
      w: pos.x - startPos.x,
      h: pos.y - startPos.y,
    });
  };

  const onMouseUp = () => {
    if (currentShape && (Math.abs(currentShape.w) > 5 || Math.abs(currentShape.h) > 5)) {
      const s = { ...currentShape };
      if (s.w < 0) { s.x += s.w; s.w = -s.w; }
      if (s.h < 0) { s.y += s.h; s.h = -s.h; }
      setShapes(prev => [...prev, s]);
    }
    setDragging(false);
    setCurrentShape(null);
  };

  const renderShape = (s: Shape, key: number | string) => {
    const normalS = { ...s };
    if (normalS.w < 0) { normalS.x += normalS.w; normalS.w = -normalS.w; }
    if (normalS.h < 0) { normalS.y += normalS.h; normalS.h = -normalS.h; }

    switch (normalS.type) {
      case "rect": return <rect key={key} x={normalS.x} y={normalS.y} width={normalS.w} height={normalS.h} fill={normalS.fill} stroke={normalS.stroke} strokeWidth={normalS.strokeWidth} />;
      case "circle": return <ellipse key={key} cx={normalS.x + normalS.w / 2} cy={normalS.y + normalS.h / 2} rx={normalS.w / 2} ry={normalS.h / 2} fill={normalS.fill} stroke={normalS.stroke} strokeWidth={normalS.strokeWidth} />;
      case "line": return <line key={key} x1={normalS.x} y1={normalS.y} x2={normalS.x + normalS.w} y2={normalS.y + normalS.h} stroke={normalS.stroke} strokeWidth={normalS.strokeWidth} />;
      case "triangle": return <polygon key={key} points={`${normalS.x + normalS.w / 2},${normalS.y} ${normalS.x},${normalS.y + normalS.h} ${normalS.x + normalS.w},${normalS.y + normalS.h}`} fill={normalS.fill} stroke={normalS.stroke} strokeWidth={normalS.strokeWidth} />;
    }
  };

  const downloadSvg = () => {
    if (!svgRef.current) return;
    const data = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.download = "icon.svg";
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  const downloadPng = () => {
    if (!svgRef.current) return;
    const data = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = canvasSize.w; c.height = canvasSize.h;
      c.getContext("2d")!.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = "icon.png";
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><PenTool className="h-5 w-5 text-primary" /> SVG / Icon Maker</h2>
        <div className="flex flex-wrap gap-2">
          {([["rect", Square], ["circle", Circle], ["line", Minus], ["triangle", Triangle]] as const).map(([t, Icon]) => (
            <button key={t} onClick={() => setTool(t)} className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-colors ${tool === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}>
              <Icon className="h-3 w-3" /> {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div><Label>Fill</Label><input type="color" value={fill} onChange={e => setFill(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
          <div><Label>Stroke</Label><input type="color" value={stroke} onChange={e => setStroke(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
          <div className="w-32"><Label>Width: {strokeWidth}</Label><Slider value={[strokeWidth]} onValueChange={v => setStrokeWidth(v[0])} min={0} max={20} /></div>
          <Button variant="ghost" size="sm" onClick={() => setShapes([])}>Clear All</Button>
          {shapes.length > 0 && <Button variant="ghost" size="sm" onClick={() => setShapes(prev => prev.slice(0, -1))}>Undo</Button>}
        </div>
        <div className="flex justify-center">
          <svg
            ref={svgRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="border border-border rounded-lg bg-white cursor-crosshair"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {shapes.map((s, i) => renderShape(s, i))}
            {currentShape && renderShape(currentShape, "current")}
          </svg>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSvg} className="flex-1"><Download className="h-4 w-4 mr-1" />SVG</Button>
          <Button variant="outline" onClick={downloadPng} className="flex-1"><Download className="h-4 w-4 mr-1" />PNG</Button>
        </div>
      </main>
    </div>
  );
};

export default SvgEditorPage;
