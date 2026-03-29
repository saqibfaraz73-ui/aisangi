import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const WordCounterPage = () => {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const speakingTime = Math.max(1, Math.ceil(words / 130));

    // Flesch Reading Ease
    const syllables = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).reduce((sum, w) => {
      let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").match(/[aeiouy]{1,2}/g);
      return sum + (s ? Math.max(1, s.length) : 1);
    }, 0);
    const flesch = words > 0 ? Math.round(206.835 - 1.015 * (words / Math.max(1, sentences)) - 84.6 * (syllables / words)) : 0;
    const level = flesch >= 90 ? "Very Easy" : flesch >= 80 ? "Easy" : flesch >= 70 ? "Fairly Easy" : flesch >= 60 ? "Standard" : flesch >= 50 ? "Fairly Difficult" : flesch >= 30 ? "Difficult" : "Very Difficult";

    return { words, chars, charsNoSpace, sentences, paragraphs, readingTime, speakingTime, flesch, level };
  }, [text]);

  const STATS = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.chars },
    { label: "Characters (no spaces)", value: stats.charsNoSpace },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading Time", value: `${stats.readingTime} min` },
    { label: "Speaking Time", value: `${stats.speakingTime} min` },
    { label: "Flesch Score", value: `${stats.flesch} — ${stats.level}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Word Counter & Readability</h1>
        <Textarea placeholder="Type or paste your text here..." value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] bg-card border-border mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default WordCounterPage;
