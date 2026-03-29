import AppHeader from "@/components/AppHeader";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Download, User, Briefcase, GraduationCap, Award, Globe, Link2, Camera } from "lucide-react";

// ── Types ──────────────────────────────────────────
interface Experience {
  id: string; title: string; company: string; location: string; from: string; to: string; current: boolean; description: string;
}
interface Education {
  id: string; degree: string; institution: string; location: string; from: string; to: string; grade: string;
}
interface Skill { id: string; name: string; level: number; }
interface ExternalLink { id: string; label: string; url: string; }
interface CvData {
  fullName: string; jobTitle: string; email: string; phone: string; address: string; summary: string;
  photo: string | null;
  experiences: Experience[]; education: Education[]; skills: Skill[];
  languages: { id: string; name: string; level: string }[];
  links: ExternalLink[];
  certifications: { id: string; name: string; issuer: string; year: string }[];
}

const uid = () => crypto.randomUUID();

const INITIAL: CvData = {
  fullName: "", jobTitle: "", email: "", phone: "", address: "", summary: "", photo: null,
  experiences: [], education: [], skills: [], languages: [], links: [], certifications: [],
};

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Traditional single-column" },
  { id: "modern", name: "Modern", desc: "Two-column sidebar layout" },
  { id: "minimal", name: "Minimal", desc: "Clean & whitespace-focused" },
];

// ── CV Preview Components ──────────────────────────
function ClassicPreview({ data }: { data: CvData }) {
  return (
    <div className="bg-white text-black p-8 w-full font-['Georgia',serif] text-[11px] leading-relaxed">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {data.photo && (
          <img src={data.photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-wide uppercase text-gray-900">{data.fullName || "Your Name"}</h1>
          {data.jobTitle && <p className="text-sm text-gray-600 mt-0.5">{data.jobTitle}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px] text-gray-500">
            {data.email && <span>{data.email}</span>}
            {data.phone && <span>{data.phone}</span>}
            {data.address && <span>{data.address}</span>}
          </div>
        </div>
      </div>
      <hr className="border-gray-400 mb-3" />
      {data.summary && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1">Professional Summary</h2>
          <p className="text-[10.5px] text-gray-700 mb-3 whitespace-pre-line">{data.summary}</p>
        </>
      )}
      {data.experiences.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1">Experience</h2>
          {data.experiences.map(e => (
            <div key={e.id} className="mb-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">{e.title}</span>
                <span className="text-[10px] text-gray-500">{e.from} – {e.current ? "Present" : e.to}</span>
              </div>
              <p className="text-[10px] text-gray-600">{e.company}{e.location ? `, ${e.location}` : ""}</p>
              {e.description && <p className="text-[10px] text-gray-700 mt-0.5 whitespace-pre-line">{e.description}</p>}
            </div>
          ))}
        </>
      )}
      {data.education.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1 mt-3">Education</h2>
          {data.education.map(e => (
            <div key={e.id} className="mb-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">{e.degree}</span>
                <span className="text-[10px] text-gray-500">{e.from} – {e.to}</span>
              </div>
              <p className="text-[10px] text-gray-600">{e.institution}{e.location ? `, ${e.location}` : ""}</p>
              {e.grade && <p className="text-[10px] text-gray-500">Grade: {e.grade}</p>}
            </div>
          ))}
        </>
      )}
      {data.skills.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1 mt-3">Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map(s => (
              <span key={s.id} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] rounded">{s.name}</span>
            ))}
          </div>
        </>
      )}
      {data.languages.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1 mt-3">Languages</h2>
          <div className="flex flex-wrap gap-x-4 text-[10px]">
            {data.languages.map(l => <span key={l.id}>{l.name} — {l.level}</span>)}
          </div>
        </>
      )}
      {data.certifications.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1 mt-3">Certifications</h2>
          {data.certifications.map(c => (
            <p key={c.id} className="text-[10px]"><span className="font-semibold">{c.name}</span> — {c.issuer} ({c.year})</p>
          ))}
        </>
      )}
      {data.links.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1 mt-3">Links</h2>
          {data.links.map(l => (
            <p key={l.id} className="text-[10px]"><a href={l.url} className="text-blue-700 underline">{l.label || "Link"}</a> — <span className="text-gray-500">{l.url}</span></p>
          ))}
        </>
      )}
    </div>
  );
}

function ModernPreview({ data }: { data: CvData }) {
  return (
    <div className="bg-white text-black flex w-full text-[11px] leading-relaxed">
      {/* Sidebar */}
      <div className="w-[35%] bg-slate-800 text-white p-5 flex flex-col gap-3">
        {data.photo && (
          <img src={data.photo} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-slate-500 mx-auto" />
        )}
        <h1 className="text-lg font-bold text-center">{data.fullName || "Your Name"}</h1>
        {data.jobTitle && <p className="text-[10px] text-slate-300 text-center">{data.jobTitle}</p>}
        <hr className="border-slate-600" />
        <div className="text-[10px] space-y-1 text-slate-300">
          <p className="font-semibold text-white text-[11px] uppercase tracking-wider">Contact</p>
          {data.email && <p>{data.email}</p>}
          {data.phone && <p>{data.phone}</p>}
          {data.address && <p>{data.address}</p>}
        </div>
        {data.skills.length > 0 && (
          <div>
            <p className="font-semibold text-white text-[11px] uppercase tracking-wider mb-1">Skills</p>
            {data.skills.map(s => (
              <div key={s.id} className="mb-1">
                <span className="text-[10px]">{s.name}</span>
                <div className="w-full bg-slate-600 rounded-full h-1.5 mt-0.5">
                  <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${s.level}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <p className="font-semibold text-white text-[11px] uppercase tracking-wider mb-1">Languages</p>
            {data.languages.map(l => <p key={l.id} className="text-[10px] text-slate-300">{l.name} — {l.level}</p>)}
          </div>
        )}
      </div>
      {/* Main */}
      <div className="flex-1 p-6">
        {data.summary && (
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">Profile</h2>
            <p className="text-[10.5px] text-gray-700 whitespace-pre-line">{data.summary}</p>
          </div>
        )}
        {data.experiences.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">Experience</h2>
            {data.experiences.map(e => (
              <div key={e.id} className="mb-2.5">
                <div className="flex justify-between"><span className="font-semibold">{e.title}</span><span className="text-[10px] text-gray-500">{e.from} – {e.current ? "Present" : e.to}</span></div>
                <p className="text-[10px] text-gray-600 italic">{e.company}{e.location ? `, ${e.location}` : ""}</p>
                {e.description && <p className="text-[10px] text-gray-700 mt-0.5 whitespace-pre-line">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">Education</h2>
            {data.education.map(e => (
              <div key={e.id} className="mb-2">
                <div className="flex justify-between"><span className="font-semibold">{e.degree}</span><span className="text-[10px] text-gray-500">{e.from} – {e.to}</span></div>
                <p className="text-[10px] text-gray-600">{e.institution}{e.location ? `, ${e.location}` : ""}</p>
                {e.grade && <p className="text-[10px] text-gray-500">Grade: {e.grade}</p>}
              </div>
            ))}
          </div>
        )}
        {data.certifications.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">Certifications</h2>
            {data.certifications.map(c => (
              <p key={c.id} className="text-[10px] mb-1"><span className="font-semibold">{c.name}</span> — {c.issuer} ({c.year})</p>
            ))}
          </div>
        )}
        {data.links.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">Links</h2>
            {data.links.map(l => (
              <p key={l.id} className="text-[10px] mb-1"><a href={l.url} className="text-blue-700 underline">{l.label || "Link"}</a> — <span className="text-gray-500">{l.url}</span></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalPreview({ data }: { data: CvData }) {
  return (
    <div className="bg-white text-black p-10 w-full font-['Helvetica','Arial',sans-serif] text-[11px] leading-relaxed">
      <div className="flex items-start gap-4 mb-6">
        {data.photo && (
          <img src={data.photo} alt="Profile" className="w-16 h-16 rounded object-cover flex-shrink-0" />
        )}
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">{data.fullName || "Your Name"}</h1>
          {data.jobTitle && <p className="text-sm text-gray-400 font-light">{data.jobTitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-0.5 text-[10px] text-gray-400 mb-6">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>{data.phone}</span>}
        {data.address && <span>{data.address}</span>}
      </div>
      {data.summary && <p className="text-[10.5px] text-gray-600 mb-6 max-w-[80%] whitespace-pre-line">{data.summary}</p>}
      {data.experiences.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-3">Experience</h2>
          {data.experiences.map(e => (
            <div key={e.id} className="mb-3 pl-3 border-l border-gray-200">
              <p className="font-medium text-gray-900">{e.title} <span className="font-normal text-gray-400">at {e.company}</span></p>
              <p className="text-[10px] text-gray-400">{e.from} – {e.current ? "Present" : e.to}{e.location ? ` · ${e.location}` : ""}</p>
              {e.description && <p className="text-[10px] text-gray-600 mt-0.5 whitespace-pre-line">{e.description}</p>}
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-3">Education</h2>
          {data.education.map(e => (
            <div key={e.id} className="mb-2 pl-3 border-l border-gray-200">
              <p className="font-medium text-gray-900">{e.degree}</p>
              <p className="text-[10px] text-gray-400">{e.institution} · {e.from} – {e.to}{e.grade ? ` · ${e.grade}` : ""}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-8">
        {data.skills.length > 0 && (
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1">{data.skills.map(s => <span key={s.id} className="text-[10px] text-gray-700">{s.name}</span>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`d${i}`} className="text-gray-300">·</span>, curr], [] as React.ReactNode[])}</div>
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-2">Languages</h2>
            {data.languages.map(l => <p key={l.id} className="text-[10px] text-gray-600">{l.name} ({l.level})</p>)}
          </div>
        )}
      </div>
      {data.certifications.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-2">Certifications</h2>
          {data.certifications.map(c => <p key={c.id} className="text-[10px] text-gray-600">{c.name} — {c.issuer} ({c.year})</p>)}
        </div>
      )}
      {data.links.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 mb-2">Links</h2>
          {data.links.map(l => (
            <p key={l.id} className="text-[10px]"><a href={l.url} className="text-gray-500 underline">{l.label || "Link"}</a> — <span className="text-gray-400">{l.url}</span></p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function CvGeneratorPage() {
  const [data, setData] = useState<CvData>(INITIAL);
  const [template, setTemplate] = useState("classic");
  const [activeTab, setActiveTab] = useState("personal");
  const previewRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof CvData>(key: K, val: CvData[K]) => setData(p => ({ ...p, [key]: val })), []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const downloadPdf = async () => {
    if (!previewRef.current) return;
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = 297;
      const canvasRatio = canvas.width / canvas.height;
      const margin = 5;
      const availW = pdfW - margin * 2;
      const availH = pdfH - margin * 2;
      let imgW = availW;
      let imgH = imgW / canvasRatio;
      if (imgH > availH) {
        imgH = availH;
        imgW = imgH * canvasRatio;
      }
      const x = (pdfW - imgW) / 2;
      const y = margin;
      pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
      pdf.save(`${data.fullName || "CV"}.pdf`);
      toast.success("CV downloaded as PDF");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF generation failed. Try using browser print (Ctrl+P).");
    }
  };

  const TABS = [
    { id: "personal", label: "Personal", icon: User },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Award },
    { id: "links", label: "Links", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Professional CV Generator</h1>
          <div className="flex gap-2">
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={downloadPdf} size="sm"><Download className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor */}
          <Card className="p-4 max-h-[80vh] overflow-y-auto">
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {TABS.map(t => (
                <Button key={t.id} variant={activeTab === t.id ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(t.id)} className="flex-shrink-0">
                  <t.icon className="h-3.5 w-3.5 mr-1" />{t.label}
                </Button>
              ))}
            </div>

            {/* Personal */}
            {activeTab === "personal" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => photoInput.current?.click()} className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors flex-shrink-0">
                    {data.photo ? <img src={data.photo} className="w-full h-full object-cover" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Full Name" value={data.fullName} onChange={e => set("fullName", e.target.value)} />
                    <Input placeholder="Job Title / Designation" value={data.jobTitle} onChange={e => set("jobTitle", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Email" value={data.email} onChange={e => set("email", e.target.value)} />
                  <Input placeholder="Phone" value={data.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <Input placeholder="Address / City, Country" value={data.address} onChange={e => set("address", e.target.value)} />
                <Textarea placeholder="Professional summary (2-3 sentences about your career goals and strengths)" value={data.summary} onChange={e => set("summary", e.target.value)} rows={4} />
              </div>
            )}

            {/* Experience */}
            {activeTab === "experience" && (
              <div className="space-y-3">
                {data.experiences.map((exp, i) => (
                  <Card key={exp.id} className="p-3 space-y-2 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Experience {i + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("experiences", data.experiences.filter(e => e.id !== exp.id))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Input placeholder="Job Title" value={exp.title} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, title: e.target.value }; set("experiences", n); }} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Company" value={exp.company} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, company: e.target.value }; set("experiences", n); }} />
                      <Input placeholder="Location" value={exp.location} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, location: e.target.value }; set("experiences", n); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="From (e.g. Jan 2020)" value={exp.from} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, from: e.target.value }; set("experiences", n); }} />
                      <Input placeholder="To (e.g. Dec 2023)" value={exp.to} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, to: e.target.value }; set("experiences", n); }} disabled={exp.current} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={exp.current} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, current: e.target.checked }; set("experiences", n); }} /> Currently working here
                    </label>
                    <Textarea placeholder="Key responsibilities and achievements..." value={exp.description} onChange={e => { const n = [...data.experiences]; n[i] = { ...exp, description: e.target.value }; set("experiences", n); }} rows={3} />
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("experiences", [...data.experiences, { id: uid(), title: "", company: "", location: "", from: "", to: "", current: false, description: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Experience
                </Button>
              </div>
            )}

            {/* Education */}
            {activeTab === "education" && (
              <div className="space-y-3">
                {data.education.map((edu, i) => (
                  <Card key={edu.id} className="p-3 space-y-2 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Education {i + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("education", data.education.filter(e => e.id !== edu.id))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Input placeholder="Degree (e.g. BS Computer Science)" value={edu.degree} onChange={e => { const n = [...data.education]; n[i] = { ...edu, degree: e.target.value }; set("education", n); }} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Institution" value={edu.institution} onChange={e => { const n = [...data.education]; n[i] = { ...edu, institution: e.target.value }; set("education", n); }} />
                      <Input placeholder="Location" value={edu.location} onChange={e => { const n = [...data.education]; n[i] = { ...edu, location: e.target.value }; set("education", n); }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="From" value={edu.from} onChange={e => { const n = [...data.education]; n[i] = { ...edu, from: e.target.value }; set("education", n); }} />
                      <Input placeholder="To" value={edu.to} onChange={e => { const n = [...data.education]; n[i] = { ...edu, to: e.target.value }; set("education", n); }} />
                      <Input placeholder="GPA/Grade" value={edu.grade} onChange={e => { const n = [...data.education]; n[i] = { ...edu, grade: e.target.value }; set("education", n); }} />
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("education", [...data.education, { id: uid(), degree: "", institution: "", location: "", from: "", to: "", grade: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Education
                </Button>
              </div>
            )}

            {/* Skills, Languages, Certifications */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Skills</Label>
                  {data.skills.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 mt-1">
                      <Input placeholder="Skill name" value={s.name} className="flex-1" onChange={e => { const n = [...data.skills]; n[i] = { ...s, name: e.target.value }; set("skills", n); }} />
                      <input type="range" min={10} max={100} value={s.level} onChange={e => { const n = [...data.skills]; n[i] = { ...s, level: +e.target.value }; set("skills", n); }} className="w-20" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("skills", data.skills.filter(x => x.id !== s.id))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => set("skills", [...data.skills, { id: uid(), name: "", level: 70 }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Skill
                  </Button>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Languages</Label>
                  {data.languages.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-2 mt-1">
                      <Input placeholder="Language" value={l.name} className="flex-1" onChange={e => { const n = [...data.languages]; n[i] = { ...l, name: e.target.value }; set("languages", n); }} />
                      <Select value={l.level} onValueChange={v => { const n = [...data.languages]; n[i] = { ...l, level: v }; set("languages", n); }}>
                        <SelectTrigger className="w-28"><SelectValue placeholder="Level" /></SelectTrigger>
                        <SelectContent>
                          {["Native", "Fluent", "Advanced", "Intermediate", "Basic"].map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("languages", data.languages.filter(x => x.id !== l.id))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => set("languages", [...data.languages, { id: uid(), name: "", level: "Intermediate" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Language
                  </Button>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Certifications</Label>
                  {data.certifications.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2 mt-1">
                      <Input placeholder="Certificate name" value={c.name} className="flex-1" onChange={e => { const n = [...data.certifications]; n[i] = { ...c, name: e.target.value }; set("certifications", n); }} />
                      <Input placeholder="Issuer" value={c.issuer} className="w-28" onChange={e => { const n = [...data.certifications]; n[i] = { ...c, issuer: e.target.value }; set("certifications", n); }} />
                      <Input placeholder="Year" value={c.year} className="w-16" onChange={e => { const n = [...data.certifications]; n[i] = { ...c, year: e.target.value }; set("certifications", n); }} />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("certifications", data.certifications.filter(x => x.id !== c.id))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => set("certifications", [...data.certifications, { id: uid(), name: "", issuer: "", year: "" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Certification
                  </Button>
                </div>
              </div>
            )}

            {/* Links */}
            {activeTab === "links" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Add LinkedIn, GitHub, portfolio, or any external profile links.</p>
                {data.links.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <Input placeholder="Label (e.g. LinkedIn)" value={l.label} className="w-28" onChange={e => { const n = [...data.links]; n[i] = { ...l, label: e.target.value }; set("links", n); }} />
                    <Input placeholder="https://..." value={l.url} className="flex-1" onChange={e => { const n = [...data.links]; n[i] = { ...l, url: e.target.value }; set("links", n); }} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set("links", data.links.filter(x => x.id !== l.id))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("links", [...data.links, { id: uid(), label: "", url: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
                </Button>
              </div>
            )}
          </Card>

          {/* Preview */}
          <div className="border border-border rounded-lg overflow-auto max-h-[80vh] bg-muted/20">
            <div ref={previewRef} className="w-[210mm] max-w-full mx-auto shadow-lg">
              {template === "classic" && <ClassicPreview data={data} />}
              {template === "modern" && <ModernPreview data={data} />}
              {template === "minimal" && <MinimalPreview data={data} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
