import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Card { id: string; front: string; back: string; }

const FlashcardGeneratorPage = () => {
  const [cards, setCards] = useState<Card[]>([{ id: crypto.randomUUID(), front: "", back: "" }]);
  const [studyMode, setStudyMode] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const navigate = useNavigate();

  const update = (i: number, field: "front" | "back", val: string) => {
    const c = [...cards]; c[i] = { ...c[i], [field]: val }; setCards(c);
  };

  const parseBulk = () => {
    const lines = bulkText.split("\n").filter(l => l.includes("|") || l.includes("—") || l.includes("-"));
    const parsed = lines.map(l => {
      const parts = l.split(/[|—]|-{2,}/).map(s => s.trim());
      return { id: crypto.randomUUID(), front: parts[0] || "", back: parts[1] || "" };
    }).filter(c => c.front);
    if (parsed.length) setCards([...cards, ...parsed]);
    setBulkText("");
  };

  const validCards = cards.filter(c => c.front && c.back);
  const current = validCards[currentIdx];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => { if (studyMode) { setStudyMode(false); } else navigate("/"); }} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> {studyMode ? "Back to Editor" : "Back"}
        </Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Flashcard Generator</h1>

        {!studyMode ? (
          <>
            <div className="space-y-3 mb-4">
              {cards.map((c, i) => (
                <div key={c.id} className="flex gap-2 items-start p-3 rounded-lg border border-border bg-card">
                  <Input placeholder="Front (Question)" value={c.front} onChange={e => update(i, "front", e.target.value)} className="flex-1" />
                  <Input placeholder="Back (Answer)" value={c.back} onChange={e => update(i, "back", e.target.value)} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setCards(cards.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-6">
              <Button variant="outline" size="sm" onClick={() => setCards([...cards, { id: crypto.randomUUID(), front: "", back: "" }])}><Plus className="h-4 w-4 mr-1" /> Add Card</Button>
              {validCards.length >= 2 && <Button size="sm" onClick={() => { setStudyMode(true); setCurrentIdx(0); setFlipped(false); }}>Study ({validCards.length} cards)</Button>}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-foreground mb-2">Bulk Import (Front | Back per line)</h3>
              <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="What is H2O? | Water&#10;Capital of France? | Paris" className="min-h-[80px] mb-2" />
              <Button size="sm" variant="outline" onClick={parseBulk} disabled={!bulkText.trim()}>Import</Button>
            </div>
          </>
        ) : current ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-sm text-muted-foreground">{currentIdx + 1} / {validCards.length}</div>
            <div
              onClick={() => setFlipped(!flipped)}
              className="w-full max-w-md h-64 rounded-2xl border-2 border-primary/30 bg-card flex items-center justify-center p-8 cursor-pointer hover:border-primary/60 transition-all"
            >
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-2">{flipped ? "ANSWER" : "QUESTION"}</div>
                <div className="text-xl font-medium text-foreground">{flipped ? current.back : current.front}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Tap card to flip</div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => { setCurrentIdx(currentIdx - 1); setFlipped(false); }}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setCards(validCards.sort(() => Math.random() - 0.5)); setCurrentIdx(0); setFlipped(false); }}><RotateCcw className="h-4 w-4 mr-1" /> Shuffle</Button>
              <Button variant="outline" size="sm" disabled={currentIdx === validCards.length - 1} onClick={() => { setCurrentIdx(currentIdx + 1); setFlipped(false); }}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default FlashcardGeneratorPage;
