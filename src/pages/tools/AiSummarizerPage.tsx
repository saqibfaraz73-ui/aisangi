import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LENGTHS = [
  { value: "brief", label: "Brief (1-2 sentences)" },
  { value: "medium", label: "Medium (paragraph)" },
  { value: "detailed", label: "Detailed (multiple paragraphs)" },
  { value: "bullet", label: "Bullet Points" },
];

const AiSummarizerPage = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSummarize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-text-tool", {
        body: { action: "summarize", text: input, length },
      });
      if (error) throw error;
      setOutput(data.result || "");
    } catch (err: any) {
      toast({ title: "Summarize failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">AI Summarizer</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Textarea placeholder="Paste a long article, paper, or text..." value={input} onChange={e => setInput(e.target.value)} className="min-h-[250px] bg-card border-border" />
            <div className="flex gap-2">
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>{LENGTHS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleSummarize} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Summarize
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Textarea readOnly value={output} placeholder="Summary will appear here..." className="min-h-[250px] bg-card border-border" />
            {output && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(output); toast({ title: "Copied!" }); }}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AiSummarizerPage;
