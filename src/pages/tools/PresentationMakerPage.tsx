import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Presentation, Download, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

interface Slide { title: string; content: string; }

const PresentationMakerPage = () => {
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<Slide[]>([{ title: "", content: "" }]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateFromAI = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-text-tool", {
        body: { action: "presentation", text: topic },
      });
      if (error) throw error;
      if (data.slides) setSlides(data.slides);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540] });
    slides.forEach((s, i) => {
      if (i > 0) doc.addPage([960, 540], "landscape");
      doc.setFillColor(30, 30, 50);
      doc.rect(0, 0, 960, 540, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.text(s.title || `Slide ${i + 1}`, 60, 80);
      doc.setFontSize(16);
      doc.setTextColor(200, 200, 200);
      const lines = doc.splitTextToSize(s.content || "", 840);
      doc.text(lines, 60, 140);
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`${i + 1} / ${slides.length}`, 900, 520, { align: "right" });
    });
    doc.save("presentation.pdf");
  };

  const updateSlide = (i: number, field: keyof Slide, val: string) => {
    const c = [...slides]; c[i] = { ...c[i], [field]: val }; setSlides(c);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Presentation Maker</h1>

        <div className="flex gap-2 mb-6">
          <Input placeholder="Enter topic for AI to generate slides..." value={topic} onChange={e => setTopic(e.target.value)} className="flex-1" />
          <Button onClick={generateFromAI} disabled={generating || !topic.trim()}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Presentation className="h-4 w-4 mr-1" />}
            Generate Slides
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          {slides.map((s, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-bold">Slide {i + 1}</span>
                <div className="flex-1" />
                {slides.length > 1 && <Button variant="ghost" size="icon" onClick={() => setSlides(slides.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
              <Input placeholder="Slide Title" value={s.title} onChange={e => updateSlide(i, "title", e.target.value)} />
              <Textarea placeholder="Slide Content" value={s.content} onChange={e => updateSlide(i, "content", e.target.value)} className="min-h-[80px]" />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSlides([...slides, { title: "", content: "" }])}><Plus className="h-4 w-4 mr-1" /> Add Slide</Button>
          <Button size="sm" onClick={exportPDF} disabled={slides.every(s => !s.title && !s.content)}>
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PresentationMakerPage;
