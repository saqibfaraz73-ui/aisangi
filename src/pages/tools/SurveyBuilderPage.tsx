import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Copy, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FormField { id: string; label: string; type: string; options: string; required: boolean; }

const SurveyBuilderPage = () => {
  const [title, setTitle] = useState("My Survey");
  const [fields, setFields] = useState<FormField[]>([{ id: crypto.randomUUID(), label: "", type: "text", options: "", required: false }]);
  const [preview, setPreview] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const addField = () => setFields([...fields, { id: crypto.randomUUID(), label: "", type: "text", options: "", required: false }]);
  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));
  const updateField = (id: string, key: keyof FormField, val: any) => setFields(fields.map(f => f.id === id ? { ...f, [key]: val } : f));

  const exportHTML = () => {
    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}label{display:block;margin:16px 0 4px;font-weight:bold}input,select,textarea{width:100%;padding:8px;border:1px solid #ccc;border-radius:4px}button{margin-top:20px;padding:10px 24px;background:#4f46e5;color:white;border:none;border-radius:6px;cursor:pointer}</style></head><body><h1>${title}</h1><form>${fields.filter(f => f.label).map(f => {
      if (f.type === "textarea") return `<label>${f.label}${f.required ? " *" : ""}</label><textarea rows="3" ${f.required ? "required" : ""}></textarea>`;
      if (f.type === "select") return `<label>${f.label}${f.required ? " *" : ""}</label><select ${f.required ? "required" : ""}>${f.options.split(",").map(o => `<option>${o.trim()}</option>`).join("")}</select>`;
      if (f.type === "radio") return `<label>${f.label}${f.required ? " *" : ""}</label>${f.options.split(",").map(o => `<label style="font-weight:normal"><input type="radio" name="${f.id}" value="${o.trim()}"> ${o.trim()}</label>`).join("")}`;
      return `<label>${f.label}${f.required ? " *" : ""}</label><input type="${f.type}" ${f.required ? "required" : ""}>`;
    }).join("")}<button type="submit">Submit</button></form></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "survey.html"; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => { if (preview) setPreview(false); else navigate("/"); }} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> {preview ? "Back to Editor" : "Back"}</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Survey / Form Builder</h1>

        {!preview ? (
          <>
            <Input placeholder="Survey Title" value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-bold mb-4" />
            <div className="space-y-3 mb-4">
              {fields.map((f, i) => (
                <div key={f.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Question label" value={f.label} onChange={e => updateField(f.id, "label", e.target.value)} className="flex-1" />
                    <select value={f.type} onChange={e => updateField(f.id, "type", e.target.value)} className="px-2 py-1 border rounded text-sm bg-background text-foreground border-border">
                      <option value="text">Short Text</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                      <option value="textarea">Long Text</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Radio</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => removeField(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {(f.type === "select" || f.type === "radio") && <Input placeholder="Options (comma-separated)" value={f.options} onChange={e => updateField(f.id, "options", e.target.value)} />}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, "required", e.target.checked)} /> Required
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addField}><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
              <Button size="sm" onClick={() => setPreview(true)}>Preview</Button>
              <Button size="sm" variant="outline" onClick={exportHTML}><Download className="h-4 w-4 mr-1" /> Export HTML</Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
            <div className="space-y-4">
              {fields.filter(f => f.label).map(f => (
                <div key={f.id}>
                  <label className="block text-sm font-medium text-foreground mb-1">{f.label}{f.required ? " *" : ""}</label>
                  {f.type === "textarea" ? <Textarea value={responses[f.id] || ""} onChange={e => setResponses({ ...responses, [f.id]: e.target.value })} /> :
                   f.type === "select" ? <select className="w-full p-2 border rounded bg-background text-foreground border-border" value={responses[f.id] || ""} onChange={e => setResponses({ ...responses, [f.id]: e.target.value })}><option value="">Select...</option>{f.options.split(",").map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}</select> :
                   f.type === "radio" ? <div className="flex gap-3">{f.options.split(",").map(o => <label key={o.trim()} className="flex items-center gap-1 text-sm text-foreground"><input type="radio" name={f.id} value={o.trim()} checked={responses[f.id] === o.trim()} onChange={() => setResponses({ ...responses, [f.id]: o.trim() })} /> {o.trim()}</label>)}</div> :
                   <Input type={f.type} value={responses[f.id] || ""} onChange={e => setResponses({ ...responses, [f.id]: e.target.value })} />}
                </div>
              ))}
              <Button onClick={() => toast({ title: "Form submitted (preview mode)" })}>Submit</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SurveyBuilderPage;
