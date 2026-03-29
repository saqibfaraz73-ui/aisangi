import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TONES = [
  { value: "standard", label: "Standard" },
  { value: "formal", label: "Formal / Academic" },
  { value: "casual", label: "Casual" },
  { value: "creative", label: "Creative" },
  { value: "concise", label: "Concise" },
];

const ParaphraseToolPage = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tone, setTone] = useState("standard");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleParaphrase = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-text-tool", {
        body: { action: "paraphrase", text: input, tone },
      });
      if (error) throw error;
      setOutput(data.result || "");
    } catch (err: any) {
      toast({ title: "Paraphrase failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">AI Paraphrase Tool</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Textarea placeholder="Paste your text here..." value={input} onChange={e => setInput(e.target.value)} className="min-h-[250px] bg-card border-border" />
            <div className="flex gap-2">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleParaphrase} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Paraphrase
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Textarea readOnly value={output} placeholder="Paraphrased text will appear here..." className="min-h-[250px] bg-card border-border" />
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

export default ParaphraseToolPage;
