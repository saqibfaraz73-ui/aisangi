import { useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Plus, Trash2, GraduationCap } from "lucide-react";
import jsPDF from "jspdf";

type PageSize = "a4" | "letter";
type FontFamily = "times" | "arial";
type LineSpacing = "1" | "1.5" | "2";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

const ThesisFormatterPage = () => {
  const { toast } = useToast();

  // Meta
  const [thesisTitle, setThesisTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [degree, setDegree] = useState("Master of Science");
  const [department, setDepartment] = useState("");
  const [university, setUniversity] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [coSupervisor, setCoSupervisor] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");

  // Content
  const [abstractText, setAbstractText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [acknowledgement, setAcknowledgement] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([{ id: crypto.randomUUID(), title: "Introduction", content: "" }]);
  const [references, setReferences] = useState("");

  // Formatting
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [fontFamily, setFontFamily] = useState<FontFamily>("times");
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("2");
  const [marginTop, setMarginTop] = useState(1);
  const [marginBottom, setMarginBottom] = useState(1);
  const [marginLeft, setMarginLeft] = useState(1.5);
  const [marginRight, setMarginRight] = useState(1);

  const addChapter = () => setChapters(prev => [...prev, { id: crypto.randomUUID(), title: "", content: "" }]);
  const removeChapter = (id: string) => setChapters(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  const updateChapter = (id: string, field: "title" | "content", value: string) =>
    setChapters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

  const exportPDF = () => {
    try {
      const pw = pageSize === "a4" ? 210 : 215.9;
      const ph = pageSize === "a4" ? 297 : 279.4;
      const doc = new jsPDF({ unit: "mm", format: [pw, ph] });
      const ml = marginLeft * 25.4;
      const mr = marginRight * 25.4;
      const mt = marginTop * 25.4;
      const mb = marginBottom * 25.4;
      const contentWidth = pw - ml - mr;
      const font = fontFamily === "times" ? "times" : "helvetica";
      const ls = parseFloat(lineSpacing);
      const lineH = (fontSize * 0.3528) * ls;
      let y = mt;
      let pageNum = 0;

      const checkPage = (needed: number) => {
        if (y + needed > ph - mb) {
          doc.addPage([pw, ph]);
          y = mt;
          pageNum++;
        }
      };

      const addText = (text: string, options?: { bold?: boolean; size?: number; align?: "center" | "left" | "right"; indent?: number }) => {
        const sz = options?.size || fontSize;
        const lh = (sz * 0.3528) * ls;
        doc.setFont(font, options?.bold ? "bold" : "normal");
        doc.setFontSize(sz);
        const indent = options?.indent || 0;
        const w = contentWidth - indent;
        const lines = doc.splitTextToSize(text, w);
        for (const line of lines) {
          checkPage(lh);
          let x = ml + indent;
          if (options?.align === "center") x = pw / 2;
          if (options?.align === "right") x = pw - mr;
          doc.text(line, x, y, { align: options?.align || "left" });
          y += lh;
        }
      };

      const addSpacing = (mm: number) => { y += mm; };

      // === TITLE PAGE ===
      y = ph * 0.25;
      addText(thesisTitle.toUpperCase() || "THESIS TITLE", { bold: true, size: 18, align: "center" });
      if (subtitle) { addSpacing(4); addText(subtitle, { size: 14, align: "center" }); }
      addSpacing(15);
      addText("A Thesis Submitted in Partial Fulfillment", { size: 12, align: "center" });
      addText(`of the Requirements for the Degree of`, { size: 12, align: "center" });
      addSpacing(4);
      addText(degree, { bold: true, size: 14, align: "center" });
      addSpacing(12);
      addText("By", { size: 12, align: "center" });
      addSpacing(4);
      addText(authorName || "Author Name", { bold: true, size: 14, align: "center" });
      addSpacing(15);
      if (department) addText(`Department of ${department}`, { size: 12, align: "center" });
      addText(university || "University Name", { size: 12, align: "center" });
      addSpacing(10);
      addText(submissionDate || new Date().getFullYear().toString(), { size: 12, align: "center" });

      // === APPROVAL PAGE ===
      doc.addPage([pw, ph]); y = mt; pageNum++;
      addText("APPROVAL SHEET", { bold: true, size: 16, align: "center" });
      addSpacing(10);
      addText(`This thesis titled "${thesisTitle || "Thesis Title"}" by ${authorName || "Author"} is approved for the degree of ${degree}.`, { size: 12 });
      addSpacing(20);
      addText("Supervisor:", { bold: true, size: 12 });
      addSpacing(15);
      addText("_____________________________", { size: 12 });
      addText(supervisorName || "Supervisor Name", { size: 12 });
      if (coSupervisor) {
        addSpacing(15);
        addText("Co-Supervisor:", { bold: true, size: 12 });
        addSpacing(15);
        addText("_____________________________", { size: 12 });
        addText(coSupervisor, { size: 12 });
      }

      // === ABSTRACT ===
      if (abstractText) {
        doc.addPage([pw, ph]); y = mt; pageNum++;
        addText("ABSTRACT", { bold: true, size: 16, align: "center" });
        addSpacing(8);
        addText(abstractText);
        if (keywords) {
          addSpacing(6);
          addText(`Keywords: ${keywords}`, { bold: true, size: 11 });
        }
      }

      // === ACKNOWLEDGEMENT ===
      if (acknowledgement) {
        doc.addPage([pw, ph]); y = mt; pageNum++;
        addText("ACKNOWLEDGEMENT", { bold: true, size: 16, align: "center" });
        addSpacing(8);
        addText(acknowledgement);
      }

      // === TABLE OF CONTENTS ===
      doc.addPage([pw, ph]); y = mt; pageNum++;
      addText("TABLE OF CONTENTS", { bold: true, size: 16, align: "center" });
      addSpacing(8);
      const tocItems: string[] = [];
      if (abstractText) tocItems.push("Abstract");
      if (acknowledgement) tocItems.push("Acknowledgement");
      chapters.forEach((ch, i) => tocItems.push(`Chapter ${i + 1}: ${ch.title || "Untitled"}`));
      if (references) tocItems.push("References");
      tocItems.forEach(item => {
        addText(item, { size: 12 });
        addSpacing(2);
      });

      // === CHAPTERS ===
      chapters.forEach((ch, i) => {
        doc.addPage([pw, ph]); y = mt; pageNum++;
        addText(`CHAPTER ${i + 1}`, { bold: true, size: 16, align: "center" });
        addSpacing(3);
        addText(ch.title?.toUpperCase() || "UNTITLED", { bold: true, size: 14, align: "center" });
        addSpacing(8);
        if (ch.content) {
          const paragraphs = ch.content.split("\n").filter(Boolean);
          paragraphs.forEach(p => {
            addText(p.trim(), { indent: 12.7 });
            addSpacing(3);
          });
        }
      });

      // === REFERENCES ===
      if (references) {
        doc.addPage([pw, ph]); y = mt; pageNum++;
        addText("REFERENCES", { bold: true, size: 16, align: "center" });
        addSpacing(8);
        const refs = references.split("\n").filter(Boolean);
        refs.forEach(r => {
          addText(r.trim());
          addSpacing(3);
        });
      }

      // Page numbers (skip title page)
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont(font, "normal");
        doc.setFontSize(10);
        doc.text(String(i - 1), pw / 2, ph - mb / 2, { align: "center" });
      }

      doc.save(`${(thesisTitle || "thesis").replace(/\s+/g, "_")}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (err) {
      toast({ title: "PDF generation failed", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Thesis & Synopsis Formatter</h1>
            <p className="text-sm text-muted-foreground">Format academic documents with proper settings & export to PDF</p>
          </div>
        </div>

        <Tabs defaultValue="meta">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="meta">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-4 mt-4">
            <Card><CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Thesis Title</Label>
                  <Input value={thesisTitle} onChange={e => setThesisTitle(e.target.value)} placeholder="Enter thesis title" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Subtitle (optional)</Label>
                  <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} />
                </div>
                <div>
                  <Label>Author Name</Label>
                  <Input value={authorName} onChange={e => setAuthorName(e.target.value)} />
                </div>
                <div>
                  <Label>Degree</Label>
                  <Select value={degree} onValueChange={setDegree}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Bachelor of Science", "Bachelor of Arts", "Master of Science", "Master of Arts", "Master of Philosophy", "Doctor of Philosophy", "Master of Business Administration"].map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <Label>University</Label>
                  <Input value={university} onChange={e => setUniversity(e.target.value)} />
                </div>
                <div>
                  <Label>Supervisor</Label>
                  <Input value={supervisorName} onChange={e => setSupervisorName(e.target.value)} />
                </div>
                <div>
                  <Label>Co-Supervisor (optional)</Label>
                  <Input value={coSupervisor} onChange={e => setCoSupervisor(e.target.value)} />
                </div>
                <div>
                  <Label>Submission Date</Label>
                  <Input value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} placeholder="June 2024" />
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <Card><CardContent className="pt-4 space-y-3">
              <Label>Abstract</Label>
              <Textarea rows={5} value={abstractText} onChange={e => setAbstractText(e.target.value)} placeholder="Write your abstract..." />
              <Label>Keywords (comma-separated)</Label>
              <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3" />
            </CardContent></Card>

            <Card><CardContent className="pt-4 space-y-3">
              <Label>Acknowledgement</Label>
              <Textarea rows={4} value={acknowledgement} onChange={e => setAcknowledgement(e.target.value)} placeholder="I would like to thank..." />
            </CardContent></Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Chapters</h3>
              {chapters.map((ch, i) => (
                <Card key={ch.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Chapter {i + 1}</span>
                      {chapters.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChapter(ch.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Input value={ch.title} onChange={e => updateChapter(ch.id, "title", e.target.value)} placeholder="Chapter title" />
                    <Textarea rows={6} value={ch.content} onChange={e => updateChapter(ch.id, "content", e.target.value)} placeholder="Write chapter content... (separate paragraphs with blank lines)" />
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={addChapter} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Add Chapter
              </Button>
            </div>

            <Card><CardContent className="pt-4 space-y-3">
              <Label>References (one per line)</Label>
              <Textarea rows={6} value={references} onChange={e => setReferences(e.target.value)} placeholder="Paste your formatted references here, one per line..." />
              <p className="text-xs text-muted-foreground">Tip: Use the Citation Generator tool to format your references first, then paste them here.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="format" className="space-y-4 mt-4">
            <Card><CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold text-foreground">Page Settings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Page Size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">US Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Font</Label>
                  <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="times">Times New Roman</SelectItem>
                      <SelectItem value="arial">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Font Size (pt)</Label>
                  <Input type="number" className="h-8" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} min={10} max={14} />
                </div>
                <div>
                  <Label className="text-xs">Line Spacing</Label>
                  <Select value={lineSpacing} onValueChange={(v) => setLineSpacing(v as LineSpacing)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="2">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <h3 className="font-semibold text-foreground mt-4">Margins (inches)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Top</Label>
                  <Input type="number" step="0.25" className="h-8" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Bottom</Label>
                  <Input type="number" step="0.25" className="h-8" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Left (binding)</Label>
                  <Input type="number" step="0.25" className="h-8" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Right</Label>
                  <Input type="number" step="0.25" className="h-8" value={marginRight} onChange={e => setMarginRight(Number(e.target.value))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Standard thesis: 1.5" left margin for binding, 1" other margins, 12pt Times New Roman, double spacing</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <Card><CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold text-foreground">Export Document</h3>
              <p className="text-sm text-muted-foreground">Your thesis will be generated with: title page, approval sheet, abstract, acknowledgement, table of contents, chapters, and references.</p>
              <div className="flex gap-3">
                <Button onClick={exportPDF}>
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ThesisFormatterPage;
