import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Assignment { id: string; title: string; subject: string; deadline: string; priority: string; done: boolean; }

const KEY = "sangi_assignments";

const AssignmentPlannerPage = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState(""); const [deadline, setDeadline] = useState(""); const [priority, setPriority] = useState("medium");
  const navigate = useNavigate();

  useEffect(() => { const s = localStorage.getItem(KEY); if (s) setAssignments(JSON.parse(s)); }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(assignments)); }, [assignments]);

  const add = () => {
    if (!title.trim()) return;
    setAssignments([...assignments, { id: crypto.randomUUID(), title, subject, deadline, priority, done: false }]);
    setTitle(""); setSubject(""); setDeadline("");
  };

  const toggle = (id: string) => setAssignments(assignments.map(a => a.id === id ? { ...a, done: !a.done } : a));
  const remove = (id: string) => setAssignments(assignments.filter(a => a.id !== id));

  const sorted = [...assignments].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.deadline || "9999").localeCompare(b.deadline || "9999");
  });

  const isOverdue = (d: string) => d && new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();
  const isToday = (d: string) => d && new Date(d).toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Assignment Planner</h1>

        <div className="flex flex-wrap gap-2 mb-6 p-4 rounded-xl border border-border bg-card">
          <Input placeholder="Assignment title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[150px]" />
          <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-32" />
          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-40" />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={!title.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        <div className="space-y-2">
          {sorted.map(a => (
            <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${a.done ? "opacity-50 border-border" : isOverdue(a.deadline) ? "border-destructive/50" : "border-border"}`}>
              <button onClick={() => toggle(a.id)}>
                {a.done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-foreground ${a.done ? "line-through" : ""}`}>{a.title}</div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {a.subject && <span>{a.subject}</span>}
                  {a.deadline && (
                    <span className={isOverdue(a.deadline) ? "text-destructive font-bold" : isToday(a.deadline) ? "text-yellow-500 font-bold" : ""}>
                      {isOverdue(a.deadline) && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {new Date(a.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`px-1.5 rounded ${a.priority === "high" ? "bg-destructive/20 text-destructive" : a.priority === "low" ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600"}`}>{a.priority}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {assignments.length === 0 && <p className="text-center text-muted-foreground py-8">No assignments yet. Add one above!</p>}
        </div>
      </main>
    </div>
  );
};

export default AssignmentPlannerPage;
