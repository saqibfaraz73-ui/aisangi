import { useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MindNode { id: string; text: string; children: MindNode[]; x: number; y: number; }

function parseBullets(text: string): MindNode {
  const lines = text.split("\n").filter(l => l.trim());
  const root: MindNode = { id: "root", text: "Main Topic", children: [], x: 0, y: 0 };
  const stack: { node: MindNode; indent: number }[] = [{ node: root, indent: -1 }];

  for (const line of lines) {
    const indent = line.search(/\S/);
    const cleaned = line.replace(/^[\s\-\*•]+/, "").trim();
    if (!cleaned) continue;
    const node: MindNode = { id: crypto.randomUUID(), text: cleaned, children: [], x: 0, y: 0 };

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, indent });
  }

  if (root.children.length === 1 && root.children[0].children.length > 0) {
    return { ...root.children[0], id: "root" };
  }
  return root;
}

const COLORS = ["#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#3b82f6", "#f97316"];

function drawMindMap(ctx: CanvasRenderingContext2D, node: MindNode, cx: number, cy: number, angle: number, radius: number, depth: number, colorIdx: number) {
  node.x = cx; node.y = cy;
  const total = node.children.length;
  const spread = depth === 0 ? Math.PI * 2 : Math.PI * 0.8;
  const startAngle = depth === 0 ? 0 : angle - spread / 2;

  node.children.forEach((child, i) => {
    const a = total === 1 ? angle : startAngle + (spread / (total - 1 || 1)) * i;
    const r = depth === 0 ? radius : radius * 0.75;
    const nx = cx + Math.cos(a) * r;
    const ny = cy + Math.sin(a) * r;

    ctx.strokeStyle = COLORS[(colorIdx + i) % COLORS.length];
    ctx.lineWidth = Math.max(1.5, 4 - depth);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + (nx - cx) * 0.5, cy, nx, ny); ctx.stroke();

    drawMindMap(ctx, child, nx, ny, a, r, depth + 1, colorIdx + i);
  });

  // Draw node
  ctx.fillStyle = depth === 0 ? "#4f46e5" : COLORS[colorIdx % COLORS.length];
  const textW = ctx.measureText(node.text).width;
  const padX = 16; const padY = 10; const bw = textW + padX * 2; const bh = 32;
  const rx = 8;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, rx);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `${depth === 0 ? 16 : 13}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(node.text, cx, cy);
}

const NotesToMindMapPage = () => {
  const [text, setText] = useState("Machine Learning\n- Supervised\n  - Classification\n  - Regression\n- Unsupervised\n  - Clustering\n  - Dimensionality Reduction\n- Reinforcement Learning\n  - Q-Learning\n  - Policy Gradient");
  const [canvasUrl, setCanvasUrl] = useState("");
  const navigate = useNavigate();

  const generate = useCallback(() => {
    const tree = parseBullets(text);
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1200, 800);
    ctx.font = "14px sans-serif";
    drawMindMap(ctx, tree, 600, 400, 0, 220, 0, 0);
    setCanvasUrl(canvas.toDataURL("image/png"));
  }, [text]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Notes to Mind Map</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter bullet-point notes (use indentation for sub-topics)..." className="min-h-[300px] font-mono text-sm bg-card border-border" />
            <Button onClick={generate}><Network className="h-4 w-4 mr-1" /> Generate Mind Map</Button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {canvasUrl ? (
              <>
                <img src={canvasUrl} alt="Mind Map" className="w-full" />
                <div className="p-2"><Button size="sm" variant="outline" onClick={() => { const a = document.createElement("a"); a.href = canvasUrl; a.download = "mindmap.png"; a.click(); }}>Download PNG</Button></div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Click "Generate Mind Map" to preview</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotesToMindMapPage;
