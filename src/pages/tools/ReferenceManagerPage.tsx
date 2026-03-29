import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, ExternalLink, Search, Tag, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Reference { id: string; title: string; authors: string; url: string; tags: string; notes: string; addedAt: string; }

const KEY = "sangi_references";

const ReferenceManagerPage = () => {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", authors: "", url: "", tags: "", notes: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { const s = localStorage.getItem(KEY); if (s) setRefs(JSON.parse(s)); }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(refs)); }, [refs]);

  const add = () => {
    if (!form.title.trim()) return;
    setRefs([{ id: crypto.randomUUID(), ...form, addedAt: new Date().toISOString() }, ...refs]);
    setForm({ title: "", authors: "", url: "", tags: "", notes: "" }); setShowAdd(false);
  };

  const filtered = refs.filter(r => {
    const q = search.toLowerCase();
    return !q || r.title.toLowerCase().includes(q) || r.authors.toLowerCase().includes(q) || r.tags.toLowerCase().includes(q);
  });

  const exportBib = () => {
    const text = refs.map(r => `${r.authors}. "${r.title}." ${r.url ? r.url : ""} (${new Date(r.addedAt).getFullYear()})`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "references.txt"; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Reference Manager</h1>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          {refs.length > 0 && <Button size="sm" variant="outline" onClick={exportBib}><Download className="h-4 w-4 mr-1" /> Export</Button>}
        </div>

        {showAdd && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2 mb-4">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Authors" value={form.authors} onChange={e => setForm({ ...form, authors: e.target.value })} />
            <Input placeholder="URL / DOI" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={add} disabled={!form.title.trim()}>Save Reference</Button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{r.title}</div>
                  {r.authors && <div className="text-xs text-muted-foreground">{r.authors}</div>}
                  {r.tags && <div className="flex gap-1 mt-1">{r.tags.split(",").map(t => <span key={t.trim()} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"><Tag className="h-2.5 w-2.5 inline mr-0.5" />{t.trim()}</span>)}</div>}
                  {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                </div>
                <div className="flex gap-1 ml-2">
                  {r.url && <Button variant="ghost" size="icon" onClick={() => window.open(r.url, "_blank")}><ExternalLink className="h-4 w-4" /></Button>}
                  <Button variant="ghost" size="icon" onClick={() => setRefs(refs.filter(x => x.id !== r.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{search ? "No matches" : "No references saved yet"}</p>}
        </div>
      </main>
    </div>
  );
};

export default ReferenceManagerPage;
