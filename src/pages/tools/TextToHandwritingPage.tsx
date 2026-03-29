import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FONTS = [
  { label: "Handwriting 1", value: "'Caveat', cursive", import: "Caveat" },
  { label: "Handwriting 2", value: "'Indie Flower', cursive", import: "Indie+Flower" },
  { label: "Handwriting 3", value: "'Patrick Hand', cursive", import: "Patrick+Hand" },
  { label: "Handwriting 4", value: "'Kalam', cursive", import: "Kalam" },
  { label: "Handwriting 5", value: "'Shadows Into Light', cursive", import: "Shadows+Into+Light" },
];

const TextToHandwritingPage = () => {
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0].value);
  const [fontSize, setFontSize] = useState(22);
  const [color, setColor] = useState("#1a237e");
  const [lineHeight, setLineHeight] = useState(2.2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const selectedFont = FONTS.find(f => f.value === font);

  const exportImage = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pad = 60; const lineH = fontSize * lineHeight;
    const lines = text.split("\n");
    canvas.width = 800;
    canvas.height = Math.max(400, lines.length * lineH + pad * 2);
    // White paper bg
    ctx.fillStyle = "#fffff0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Rule lines
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < lines.length + 2; i++) {
      const y = pad + i * lineH;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(canvas.width - 40, y); ctx.stroke();
    }
    // Left margin line
    ctx.strokeStyle = "#f99"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, canvas.height); ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${font}`;
    lines.forEach((line, i) => ctx.fillText(line, 80, pad + (i + 1) * lineH - fontSize * 0.3));

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = "handwriting.png"; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <link href={`https://fonts.googleapis.com/css2?family=${FONTS.map(f => f.import).join("&family=")}&display=swap`} rel="stylesheet" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Text to Handwriting</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Textarea placeholder="Type your text here..." value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] bg-card border-border" />
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FONTS.map(f => <SelectItem key={f.value} value={f.value}><span style={{ fontFamily: f.value }}>{f.label}</span></SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-4">
              <div className="flex-1"><label className="text-xs text-muted-foreground">Size: {fontSize}px</label><Slider value={[fontSize]} onValueChange={v => setFontSize(v[0])} min={14} max={40} step={1} /></div>
              <div className="flex-1"><label className="text-xs text-muted-foreground">Line Height: {lineHeight.toFixed(1)}</label><Slider value={[lineHeight * 10]} onValueChange={v => setLineHeight(v[0] / 10)} min={15} max={35} step={1} /></div>
            </div>
            <div className="flex items-center gap-2"><label className="text-xs text-muted-foreground">Ink Color:</label><input type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
            <Button onClick={exportImage} disabled={!text.trim()}><Download className="h-4 w-4 mr-1" /> Download Image</Button>
          </div>

          <div className="rounded-xl border border-border p-6" style={{ backgroundColor: "#fffff0", fontFamily: font || "'Caveat', cursive", fontSize, color, lineHeight: lineHeight, backgroundImage: "repeating-linear-gradient(transparent, transparent " + (fontSize * lineHeight - 1) + "px, #ccc " + (fontSize * lineHeight - 1) + "px, #ccc " + fontSize * lineHeight + "px)", backgroundPosition: `0 ${fontSize * 0.7}px`, borderLeft: "3px solid #f99", paddingLeft: "24px" }}>
            {text || <span style={{ color: "#aaa" }}>Preview appears here...</span>}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
};

export default TextToHandwritingPage;
