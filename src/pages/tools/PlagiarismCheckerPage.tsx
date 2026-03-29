import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

function similarity(a: string, b: string): number {
  const wa = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wb = b.toLowerCase().split(/\s+/).filter(Boolean);
  if (!wa.length || !wb.length) return 0;
  const setA = new Set(wa);
  const setB = new Set(wb);
  const intersection = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return Math.round((intersection.length / union.size) * 100);
}

function findMatchingPhrases(a: string, b: string, n = 4): string[] {
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const matches: string[] = [];
  const bNgrams = new Set<string>();
  for (let i = 0; i <= wordsB.length - n; i++) bNgrams.add(wordsB.slice(i, i + n).join(" "));
  for (let i = 0; i <= wordsA.length - n; i++) {
    const ng = wordsA.slice(i, i + n).join(" ");
    if (bNgrams.has(ng) && !matches.includes(ng)) matches.push(ng);
  }
  return matches;
}

const PlagiarismCheckerPage = () => {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const navigate = useNavigate();

  const score = useMemo(() => similarity(textA, textB), [textA, textB]);
  const matches = useMemo(() => findMatchingPhrases(textA, textB), [textA, textB]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Text Similarity Checker</h1>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Textarea placeholder="Paste Text A..." value={textA} onChange={e => setTextA(e.target.value)} className="min-h-[200px] bg-card border-border" />
          <Textarea placeholder="Paste Text B..." value={textB} onChange={e => setTextB(e.target.value)} className="min-h-[200px] bg-card border-border" />
        </div>

        {textA && textB && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className={`text-5xl font-bold ${score > 60 ? "text-destructive" : score > 30 ? "text-yellow-500" : "text-green-500"}`}>{score}%</div>
              <div className="text-sm text-muted-foreground mt-2">Similarity Score</div>
              <div className="text-xs text-muted-foreground mt-1">
                {score > 60 ? "High similarity detected" : score > 30 ? "Moderate similarity" : "Low similarity — looks original"}
              </div>
            </div>

            {matches.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-bold text-foreground mb-2"><Search className="h-4 w-4 inline mr-1" />Matching Phrases ({matches.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {matches.slice(0, 20).map((m, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full">"{m}"</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlagiarismCheckerPage;
