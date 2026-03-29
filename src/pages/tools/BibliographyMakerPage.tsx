import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Copy, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Source = { id: string; type: string; authors: string; title: string; year: string; publisher: string; url: string; volume: string; issue: string; pages: string; doi: string; };
const empty = (): Source => ({ id: crypto.randomUUID(), type: "book", authors: "", title: "", year: "", publisher: "", url: "", volume: "", issue: "", pages: "", doi: "" });

const STYLES = ["APA 7", "MLA 9", "Chicago", "Harvard", "IEEE"];

const formatCitation = (s: Source, style: string): string => {
  const auth = s.authors || "Unknown";
  const yr = s.year || "n.d.";
  if (style === "APA 7") {
    if (s.type === "book") return `${auth} (${yr}). *${s.title}*. ${s.publisher}.`;
    if (s.type === "journal") return `${auth} (${yr}). ${s.title}. *${s.publisher}*${s.volume ? `, *${s.volume}*` : ""}${s.issue ? `(${s.issue})` : ""}${s.pages ? `, ${s.pages}` : ""}.${s.doi ? ` https://doi.org/${s.doi}` : ""}`;
    if (s.type === "website") return `${auth} (${yr}). *${s.title}*. ${s.publisher}. ${s.url}`;
    return `${auth} (${yr}). ${s.title}. ${s.publisher}.`;
  }
  if (style === "MLA 9") return `${auth}. "${s.title}." *${s.publisher}*, ${yr}.`;
  if (style === "Chicago") return `${auth}. *${s.title}*. ${s.publisher}, ${yr}.`;
  if (style === "Harvard") return `${auth} (${yr}) *${s.title}*. ${s.publisher}.`;
  return `${auth}, "${s.title}," ${s.publisher}, ${yr}.`; // IEEE
};

const BibliographyMakerPage = () => {
  const [sources, setSources] = useState<Source[]>([empty()]);
  const [style, setStyle] = useState("APA 7");
  const { toast } = useToast();
  const navigate = useNavigate();

  const refs = sources.filter(s => s.title).map(s => formatCitation(s, style)).sort();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-4">Bibliography Maker</h1>

        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="w-40 mb-4"><SelectValue /></SelectTrigger>
          <SelectContent>{STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>

        <div className="space-y-4 mb-6">
          {sources.map((s, i) => (
            <div key={s.id} className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex gap-2 items-center">
                <Select value={s.type} onValueChange={v => { const c = [...sources]; c[i] = { ...c[i], type: v }; setSources(c); }}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Author(s)" value={s.authors} onChange={e => { const c = [...sources]; c[i] = { ...c[i], authors: e.target.value }; setSources(c); }} />
                <Button variant="ghost" size="icon" onClick={() => setSources(sources.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Title" value={s.title} onChange={e => { const c = [...sources]; c[i] = { ...c[i], title: e.target.value }; setSources(c); }} />
                <Input placeholder="Year" value={s.year} onChange={e => { const c = [...sources]; c[i] = { ...c[i], year: e.target.value }; setSources(c); }} />
                <Input placeholder="Publisher / Journal" value={s.publisher} onChange={e => { const c = [...sources]; c[i] = { ...c[i], publisher: e.target.value }; setSources(c); }} />
                <Input placeholder="URL" value={s.url} onChange={e => { const c = [...sources]; c[i] = { ...c[i], url: e.target.value }; setSources(c); }} />
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => setSources([...sources, empty()])} className="mb-6"><Plus className="h-4 w-4 mr-1" /> Add Source</Button>

        {refs.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-bold text-foreground mb-3">References ({style})</h3>
            <div className="space-y-2 text-sm text-foreground">
              {refs.map((r, i) => <p key={i} dangerouslySetInnerHTML={{ __html: r.replace(/\*(.*?)\*/g, "<em>$1</em>") }} />)}
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(refs.join("\n\n")); toast({ title: "Copied!" }); }}>
                <Copy className="h-4 w-4 mr-1" /> Copy All
              </Button>
              <Button size="sm" variant="outline" onClick={() => { const b = new Blob([refs.join("\n\n")], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "bibliography.txt"; a.click(); }}>
                <Download className="h-4 w-4 mr-1" /> Download TXT
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BibliographyMakerPage;
