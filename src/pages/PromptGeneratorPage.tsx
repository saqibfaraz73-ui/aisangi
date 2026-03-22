import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/use-persisted-state";

const SAMPLE_TOPICS = [
  "Wedding",
  "Business & Corporate",
  "Food & Restaurant",
  "Travel & Adventure",
  "Fashion & Beauty",
  "Nature & Landscape",
  "Fitness & Health",
  "Technology & Gadgets",
  "Real Estate",
  "Birthday Party",
  "Eid Mubarak",
  "Gaming",
  "Education",
  "Pet Photography",
  "Automotive & Cars",
];

const PromptGeneratorPage = () => {
  const [topic, setTopic] = usePersistedState("sangi_promptgen_topic", "");
  const [prompts, setPrompts] = usePersistedState<string[]>("sangi_promptgen_prompts", []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has character images uploaded in text-to-image
  const hasCharacter = (() => {
    try {
      const stored = localStorage.getItem("sangi_characters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0;
      }
    } catch {}
    return false;
  })();

  const handleGenerate = async (overrideTopic?: string) => {
    const t = (overrideTopic || topic).trim();
    if (!t) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prompts", {
        body: { topic: t, count: 5, hasCharacter },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.prompts?.length) throw new Error("No prompts generated");

      setPrompts(data.prompts);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
    toast({ title: "Prompt copied!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUsePrompt = (prompt: string) => {
    sessionStorage.setItem("sangi_use_prompt", prompt);
    navigate("/");
  };

  const handleTopicClick = (t: string) => {
    setTopic(t);
    handleGenerate(t);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            AI Prompt Generator
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Enter any topic and get ready-to-use image prompts.
            {hasCharacter && (
              <span className="text-primary font-semibold"> Character detected — prompts will include your uploaded face.</span>
            )}
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic... e.g. Wedding, Business, Travel"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="flex-1 bg-card border-border text-foreground"
            />
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !topic.trim()}
              className="gradient-accent text-accent-foreground font-display font-semibold hover:opacity-90 disabled:opacity-40 shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>

          {/* Sample Topics */}
          <div className="space-y-2">
            <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
              Sample Topics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTopicClick(t)}
                  disabled={isGenerating}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Generating prompts...</p>
          </motion.div>
        )}

        {/* Results */}
        {!isGenerating && prompts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-foreground">
                Generated Prompts
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Generate More
              </Button>
            </div>

            <div className="space-y-3">
              {prompts.map((prompt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg p-4 space-y-3"
                >
                  <p className="text-sm text-foreground leading-relaxed">{prompt}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(prompt, i)}
                      className="text-xs"
                    >
                      {copiedIndex === i ? (
                        <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      {copiedIndex === i ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUsePrompt(prompt)}
                      className="text-xs gradient-accent text-accent-foreground hover:opacity-90"
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Use in Text to Image
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default PromptGeneratorPage;
