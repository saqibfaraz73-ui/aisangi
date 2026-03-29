import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, Download, BookOpen } from "lucide-react";

type SourceType = "book" | "journal" | "website" | "conference";
type CitationStyle = "apa7" | "mla9" | "chicago" | "harvard" | "ieee";

interface SourceEntry {
  id: string;
  type: SourceType;
  authors: string;
  year: string;
  title: string;
  journalOrPublisher: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  accessDate: string;
  edition: string;
  city: string;
  conferenceTitle: string;
}

const emptySource = (): SourceEntry => ({
  id: crypto.randomUUID(),
  type: "book",
  authors: "",
  year: "",
  title: "",
  journalOrPublisher: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
  accessDate: "",
  edition: "",
  city: "",
  conferenceTitle: "",
});

function formatAuthorsAPA(raw: string): string {
  const authors = raw.split(",").map(a => a.trim()).filter(Boolean);
  if (!authors.length) return "";
  const formatted = authors.map(a => {
    const parts = a.split(" ").filter(Boolean);
    if (parts.length < 2) return a;
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0].toUpperCase() + ".").join(" ");
    return `${last}, ${initials}`;
  });
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return formatted.slice(0, -1).join(", ") + ", & " + formatted[formatted.length - 1];
}

function formatAuthorsMLA(raw: string): string {
  const authors = raw.split(",").map(a => a.trim()).filter(Boolean);
  if (!authors.length) return "";
  const first = authors[0].split(" ").filter(Boolean);
  if (first.length < 2) return authors[0];
  const lastName = first[first.length - 1];
  const firstName = first.slice(0, -1).join(" ");
  const main = `${lastName}, ${firstName}`;
  if (authors.length === 1) return main;
  if (authors.length === 2) return `${main}, and ${authors[1]}`;
  return `${main}, et al.`;
}

function formatAuthorsHarvard(raw: string): string {
  return formatAuthorsAPA(raw);
}

function formatAuthorsIEEE(raw: string): string {
  const authors = raw.split(",").map(a => a.trim()).filter(Boolean);
  if (!authors.length) return "";
  const formatted = authors.map(a => {
    const parts = a.split(" ").filter(Boolean);
    if (parts.length < 2) return a;
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0].toUpperCase() + ".").join(" ");
    return `${initials} ${last}`;
  });
  if (formatted.length <= 2) return formatted.join(" and ");
  return formatted.slice(0, -1).join(", ") + ", and " + formatted[formatted.length - 1];
}

function generateCitation(s: SourceEntry, style: CitationStyle): string {
  const yr = s.year || "n.d.";
  switch (style) {
    case "apa7": {
      const auth = formatAuthorsAPA(s.authors);
      if (s.type === "book") {
        let c = `${auth} (${yr}). *${s.title}*${s.edition ? ` (${s.edition} ed.)` : ""}.`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher}.`;
        if (s.doi) c += ` https://doi.org/${s.doi}`;
        return c;
      }
      if (s.type === "journal") {
        let c = `${auth} (${yr}). ${s.title}. *${s.journalOrPublisher}*`;
        if (s.volume) c += `, *${s.volume}*`;
        if (s.issue) c += `(${s.issue})`;
        if (s.pages) c += `, ${s.pages}`;
        c += ".";
        if (s.doi) c += ` https://doi.org/${s.doi}`;
        return c;
      }
      if (s.type === "website") {
        let c = `${auth} (${yr}). *${s.title}*.`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher}.`;
        if (s.url) c += ` ${s.url}`;
        return c;
      }
      if (s.type === "conference") {
        let c = `${auth} (${yr}). ${s.title}. In *${s.conferenceTitle || s.journalOrPublisher}*`;
        if (s.pages) c += ` (pp. ${s.pages})`;
        c += ".";
        if (s.doi) c += ` https://doi.org/${s.doi}`;
        return c;
      }
      return "";
    }
    case "mla9": {
      const auth = formatAuthorsMLA(s.authors);
      if (s.type === "book") {
        let c = `${auth}. *${s.title}*.`;
        if (s.edition) c += ` ${s.edition} ed.,`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher},`;
        c += ` ${yr}.`;
        return c;
      }
      if (s.type === "journal") {
        let c = `${auth}. "${s.title}." *${s.journalOrPublisher}*`;
        if (s.volume) c += `, vol. ${s.volume}`;
        if (s.issue) c += `, no. ${s.issue}`;
        c += `, ${yr}`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += ".";
        if (s.doi) c += ` https://doi.org/${s.doi}.`;
        return c;
      }
      if (s.type === "website") {
        let c = `${auth}. "${s.title}." *${s.journalOrPublisher || "Web"}*,`;
        c += ` ${yr}.`;
        if (s.url) c += ` ${s.url}.`;
        if (s.accessDate) c += ` Accessed ${s.accessDate}.`;
        return c;
      }
      if (s.type === "conference") {
        let c = `${auth}. "${s.title}." *${s.conferenceTitle || s.journalOrPublisher}*,`;
        c += ` ${yr}`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += ".";
        return c;
      }
      return "";
    }
    case "chicago": {
      const authors = s.authors.split(",").map(a => a.trim()).filter(Boolean);
      let auth = "";
      if (authors.length) {
        const first = authors[0].split(" ").filter(Boolean);
        if (first.length >= 2) {
          auth = `${first[first.length - 1]}, ${first.slice(0, -1).join(" ")}`;
        } else auth = authors[0];
        if (authors.length === 2) auth += `, and ${authors[1]}`;
        if (authors.length > 2) auth += `, et al.`;
      }
      if (s.type === "book") {
        let c = `${auth}. *${s.title}*.`;
        if (s.edition) c += ` ${s.edition} ed.`;
        if (s.city) c += ` ${s.city}:`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher},`;
        c += ` ${yr}.`;
        return c;
      }
      if (s.type === "journal") {
        let c = `${auth}. "${s.title}." *${s.journalOrPublisher}*`;
        if (s.volume) c += ` ${s.volume}`;
        if (s.issue) c += `, no. ${s.issue}`;
        c += ` (${yr})`;
        if (s.pages) c += `: ${s.pages}`;
        c += ".";
        if (s.doi) c += ` https://doi.org/${s.doi}.`;
        return c;
      }
      if (s.type === "website") {
        let c = `${auth}. "${s.title}."`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher}.`;
        if (s.accessDate) c += ` Accessed ${s.accessDate}.`;
        if (s.url) c += ` ${s.url}.`;
        return c;
      }
      if (s.type === "conference") {
        let c = `${auth}. "${s.title}." Paper presented at ${s.conferenceTitle || s.journalOrPublisher}, ${yr}.`;
        return c;
      }
      return "";
    }
    case "harvard": {
      const auth = formatAuthorsHarvard(s.authors);
      if (s.type === "book") {
        let c = `${auth} (${yr}) *${s.title}*.`;
        if (s.edition) c += ` ${s.edition} edn.`;
        if (s.city) c += ` ${s.city}:`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher}.`;
        return c;
      }
      if (s.type === "journal") {
        let c = `${auth} (${yr}) '${s.title}', *${s.journalOrPublisher}*`;
        if (s.volume) c += `, ${s.volume}`;
        if (s.issue) c += `(${s.issue})`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += ".";
        if (s.doi) c += ` doi: ${s.doi}.`;
        return c;
      }
      if (s.type === "website") {
        let c = `${auth} (${yr}) *${s.title}*. Available at: ${s.url || ""}`;
        if (s.accessDate) c += ` (Accessed: ${s.accessDate})`;
        c += ".";
        return c;
      }
      if (s.type === "conference") {
        let c = `${auth} (${yr}) '${s.title}', in *${s.conferenceTitle || s.journalOrPublisher}*`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += ".";
        return c;
      }
      return "";
    }
    case "ieee": {
      const auth = formatAuthorsIEEE(s.authors);
      if (s.type === "book") {
        let c = `${auth}, *${s.title}*`;
        if (s.edition) c += `, ${s.edition} ed`;
        c += ".";
        if (s.city) c += ` ${s.city}:`;
        if (s.journalOrPublisher) c += ` ${s.journalOrPublisher},`;
        c += ` ${yr}.`;
        return c;
      }
      if (s.type === "journal") {
        let c = `${auth}, "${s.title}," *${s.journalOrPublisher}*`;
        if (s.volume) c += `, vol. ${s.volume}`;
        if (s.issue) c += `, no. ${s.issue}`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += `, ${yr}.`;
        if (s.doi) c += ` doi: ${s.doi}.`;
        return c;
      }
      if (s.type === "website") {
        let c = `${auth}, "${s.title}," ${s.journalOrPublisher || ""}.`;
        if (s.url) c += ` [Online]. Available: ${s.url}.`;
        if (s.accessDate) c += ` [Accessed: ${s.accessDate}].`;
        return c;
      }
      if (s.type === "conference") {
        let c = `${auth}, "${s.title}," in *${s.conferenceTitle || s.journalOrPublisher}*, ${yr}`;
        if (s.pages) c += `, pp. ${s.pages}`;
        c += ".";
        return c;
      }
      return "";
    }
  }
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "journal", label: "Journal Article" },
  { value: "website", label: "Website" },
  { value: "conference", label: "Conference Paper" },
];

const STYLES: { value: CitationStyle; label: string }[] = [
  { value: "apa7", label: "APA 7th Edition" },
  { value: "mla9", label: "MLA 9th Edition" },
  { value: "chicago", label: "Chicago / Turabian" },
  { value: "harvard", label: "Harvard" },
  { value: "ieee", label: "IEEE" },
];

const CitationGeneratorPage = () => {
  const { toast } = useToast();
  const [style, setStyle] = useState<CitationStyle>("apa7");
  const [sources, setSources] = useState<SourceEntry[]>([emptySource()]);

  const updateSource = (id: string, field: keyof SourceEntry, value: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addSource = () => setSources(prev => [...prev, emptySource()]);
  const removeSource = (id: string) => setSources(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);

  const allCitations = sources
    .filter(s => s.authors || s.title)
    .map(s => generateCitation(s, style))
    .sort((a, b) => a.localeCompare(b));

  const copyAll = () => {
    const plain = allCitations.join("\n\n");
    navigator.clipboard.writeText(plain);
    toast({ title: "References copied to clipboard" });
  };

  const downloadTxt = () => {
    const plain = allCitations.join("\n\n");
    const blob = new Blob([plain], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `references_${style}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Citation & Reference Generator</h1>
            <p className="text-sm text-muted-foreground">APA 7, MLA 9, Chicago, Harvard, IEEE formats</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="shrink-0">Citation Style:</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as CitationStyle)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {sources.map((src, idx) => (
            <Card key={src.id} className="border-border">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Source #{idx + 1}</span>
                  <div className="flex gap-2">
                    <Select value={src.type} onValueChange={(v) => updateSource(src.id, "type", v)}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {sources.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSource(src.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Authors (comma-separated: John Smith, Jane Doe)</Label>
                    <Input className="h-8 text-sm" value={src.authors} onChange={e => updateSource(src.id, "authors", e.target.value)} placeholder="John Smith, Jane Doe" />
                  </div>
                  <div>
                    <Label className="text-xs">Year</Label>
                    <Input className="h-8 text-sm" value={src.year} onChange={e => updateSource(src.id, "year", e.target.value)} placeholder="2024" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Title</Label>
                    <Input className="h-8 text-sm" value={src.title} onChange={e => updateSource(src.id, "title", e.target.value)} placeholder="Title of the work" />
                  </div>
                  <div>
                    <Label className="text-xs">{src.type === "journal" ? "Journal Name" : src.type === "website" ? "Website Name" : "Publisher"}</Label>
                    <Input className="h-8 text-sm" value={src.journalOrPublisher} onChange={e => updateSource(src.id, "journalOrPublisher", e.target.value)} />
                  </div>
                  {(src.type === "book") && (
                    <>
                      <div>
                        <Label className="text-xs">Edition (e.g. 2nd)</Label>
                        <Input className="h-8 text-sm" value={src.edition} onChange={e => updateSource(src.id, "edition", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input className="h-8 text-sm" value={src.city} onChange={e => updateSource(src.id, "city", e.target.value)} />
                      </div>
                    </>
                  )}
                  {(src.type === "journal" || src.type === "conference") && (
                    <>
                      <div>
                        <Label className="text-xs">Volume</Label>
                        <Input className="h-8 text-sm" value={src.volume} onChange={e => updateSource(src.id, "volume", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Issue</Label>
                        <Input className="h-8 text-sm" value={src.issue} onChange={e => updateSource(src.id, "issue", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Pages (e.g. 12-25)</Label>
                        <Input className="h-8 text-sm" value={src.pages} onChange={e => updateSource(src.id, "pages", e.target.value)} />
                      </div>
                    </>
                  )}
                  {src.type === "conference" && (
                    <div>
                      <Label className="text-xs">Conference Name</Label>
                      <Input className="h-8 text-sm" value={src.conferenceTitle} onChange={e => updateSource(src.id, "conferenceTitle", e.target.value)} />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">DOI</Label>
                    <Input className="h-8 text-sm" value={src.doi} onChange={e => updateSource(src.id, "doi", e.target.value)} placeholder="10.xxxx/xxxxx" />
                  </div>
                  {(src.type === "website") && (
                    <>
                      <div>
                        <Label className="text-xs">URL</Label>
                        <Input className="h-8 text-sm" value={src.url} onChange={e => updateSource(src.id, "url", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Access Date</Label>
                        <Input className="h-8 text-sm" value={src.accessDate} onChange={e => updateSource(src.id, "accessDate", e.target.value)} placeholder="January 15, 2024" />
                      </div>
                    </>
                  )}
                </div>
                {(src.authors || src.title) && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground whitespace-pre-wrap break-words border border-border">
                    {generateCitation(src, style)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={addSource} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Another Source
        </Button>

        {allCitations.length > 0 && (
          <Card className="border-primary/30">
            <CardContent className="pt-4 space-y-3">
              <h3 className="font-semibold text-foreground">References / Bibliography</h3>
              <div className="bg-muted/50 rounded-md p-4 text-sm text-foreground space-y-3 border border-border">
                {allCitations.map((c, i) => (
                  <p key={i} className="break-words" style={{ textIndent: "-2em", paddingLeft: "2em" }}>{c}</p>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={copyAll}><Copy className="h-4 w-4 mr-1" />Copy All</Button>
                <Button size="sm" variant="outline" onClick={downloadTxt}><Download className="h-4 w-4 mr-1" />Download TXT</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CitationGeneratorPage;
