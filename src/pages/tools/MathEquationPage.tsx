import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SYMBOLS = [
  { label: "α", val: "\\alpha" }, { label: "β", val: "\\beta" }, { label: "γ", val: "\\gamma" },
  { label: "Σ", val: "\\sum" }, { label: "∫", val: "\\int" }, { label: "√", val: "\\sqrt{}" },
  { label: "x²", val: "x^{2}" }, { label: "xₙ", val: "x_{n}" }, { label: "÷", val: "\\div" },
  { label: "×", val: "\\times" }, { label: "±", val: "\\pm" }, { label: "≠", val: "\\neq" },
  { label: "≤", val: "\\leq" }, { label: "≥", val: "\\geq" }, { label: "∞", val: "\\infty" },
  { label: "frac", val: "\\frac{a}{b}" }, { label: "π", val: "\\pi" }, { label: "θ", val: "\\theta" },
];

const renderLatex = (latex: string): string => {
  let h = latex
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle"><span style="border-bottom:1px solid currentColor;padding:0 4px">$1</span><span style="padding:0 4px">$2</span></span>')
    .replace(/\\sqrt\{([^}]*)\}/g, '√<span style="border-top:1px solid currentColor;padding:0 2px">$1</span>')
    .replace(/\^{([^}]*)}/g, '<sup>$1</sup>')
    .replace(/_{([^}]*)}/g, '<sub>$1</sub>')
    .replace(/\\alpha/g, "α").replace(/\\beta/g, "β").replace(/\\gamma/g, "γ")
    .replace(/\\theta/g, "θ").replace(/\\pi/g, "π").replace(/\\infty/g, "∞")
    .replace(/\\sum/g, "Σ").replace(/\\int/g, "∫").replace(/\\div/g, "÷")
    .replace(/\\times/g, "×").replace(/\\pm/g, "±").replace(/\\neq/g, "≠")
    .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥");
  return h;
};

const MathEquationPage = () => {
  const [latex, setLatex] = useState("\\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const insertSymbol = (val: string) => setLatex(p => p + " " + val);

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 800; canvas.height = 200;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 800, 200);
    ctx.fillStyle = "#000000"; ctx.font = "32px serif";
    const text = latex.replace(/\\[a-z]+/g, m => {
      const map: Record<string,string> = { "\\alpha":"α","\\beta":"β","\\gamma":"γ","\\theta":"θ","\\pi":"π","\\infty":"∞","\\sum":"Σ","\\int":"∫","\\div":"÷","\\times":"×","\\pm":"±","\\neq":"≠","\\leq":"≤","\\geq":"≥","\\sqrt":"√","\\frac":"/" };
      return map[m] || m;
    }).replace(/[{}\\^_]/g, "");
    ctx.fillText(text, 40, 120);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "equation.png"; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Math Equation Editor</h1>

        <div className="flex flex-wrap gap-1 mb-4">
          {SYMBOLS.map(s => (
            <Button key={s.val} variant="outline" size="sm" className="text-base px-3" onClick={() => insertSymbol(s.val)}>{s.label}</Button>
          ))}
        </div>

        <Textarea value={latex} onChange={e => setLatex(e.target.value)} className="font-mono min-h-[100px] bg-card border-border mb-4" placeholder="Enter LaTeX equation..." />

        <div className="rounded-xl border border-border bg-card p-8 mb-4 text-center">
          <div className="text-3xl text-foreground" dangerouslySetInnerHTML={{ __html: renderLatex(latex) }} />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(latex); toast({ title: "LaTeX copied!" }); }}>
            <Copy className="h-4 w-4 mr-1" /> Copy LaTeX
          </Button>
          <Button size="sm" onClick={exportImage}><Download className="h-4 w-4 mr-1" /> Export PNG</Button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
};

export default MathEquationPage;
