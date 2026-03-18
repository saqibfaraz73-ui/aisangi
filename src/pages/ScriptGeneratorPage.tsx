import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, Film, Mic, Hash, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import AppHeader from "@/components/AppHeader";
import SceneCountSelector from "@/components/SceneCountSelector";
import { SceneVoiceButton } from "@/components/SceneVoiceButton";
import FullScriptVoiceButton from "@/components/FullScriptVoiceButton";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/use-persisted-state";

interface Scene {
  sceneNumber: number;
  imagePrompt: string;
  narration: string;
}

interface GeneratedScript {
  title: string;
  scenes: Scene[];
  fullNarration: string;
  hashtags: string[];
}

const EXAMPLE_IDEAS = [
  "A viral kid video about a puppy who learns to skateboard",
  "Motivational morning routine for entrepreneurs",
  "Funny cat vs cucumber compilation story",
  "Satisfying art transformation before and after",
];

const ScriptGeneratorPage = () => {
  const [idea, setIdea] = usePersistedState("sangi_script_idea", "");
  const [sceneCount, setSceneCount] = usePersistedState("sangi_script_sceneCount", 3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = usePersistedState<GeneratedScript | null>("sangi_script_result", null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sceneVoices, setSceneVoices] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const { checkAndTrack } = useUsageLimit("script_ai");
  const navigate = useNavigate();

  const getSceneVoice = (sceneNum: number) => sceneVoices[sceneNum] || "Kore";
  const setSceneVoice = (sceneNum: number, voice: string) =>
    setSceneVoices((prev) => ({ ...prev, [sceneNum]: voice }));

  const handleGenerate = async () => {
    if (!idea.trim()) {
      toast({ title: "Please enter a video idea", variant: "destructive" });
      return;
    }

    const allowed = await checkAndTrack();
    if (!allowed) return;

    setIsGenerating(true);
    setScript(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: { idea: idea.trim(), sceneCount },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.scenes?.length) throw new Error("No script generated");

      setScript(data);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const usePromptsForImageGen = () => {
    if (!script) return;
    const prompts = script.scenes.map((s) => s.imagePrompt);
    sessionStorage.setItem("ai_scene_prompts", JSON.stringify(prompts));
    sessionStorage.setItem("ai_narration", script.fullNarration);
    toast({ title: "Scene prompts ready! Redirecting to image generator..." });
    navigate("/");
  };

  const handleClear = () => {
    setIdea("");
    setScript(null);
    setSceneCount(3);
    toast({ title: "Cleared all data" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            AI Video Script Generator
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Describe your video idea and AI will generate scene-by-scene image prompts and a voiceover narration script.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">
                Your Video Idea
              </label>
              <Textarea
                placeholder="Describe your video concept... e.g. 'A viral kid video about a puppy who learns to skateboard'"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                className="min-h-[120px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the theme, mood, and target audience for better results.
              </p>
            </div>

            <SceneCountSelector count={sceneCount} onChange={setSceneCount} />

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !idea.trim()}
                className="flex-1 h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Script
                  </>
                )}
              </Button>
              {(script || idea) && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Example ideas */}
            <div className="space-y-2">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                Try these ideas
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_IDEAS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setIdea(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left"
                  >
                    {p.length > 50 ? p.substring(0, 50) + "…" : p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border border-border bg-card/50"
                >
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">AI is crafting your script...</p>
                </motion.div>
              ) : script ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Title */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-bold text-lg text-foreground">
                        {script.title}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(script.title, "title")}
                      >
                        {copiedField === "title" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    {script.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {script.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            <Hash className="h-3 w-3 mr-0.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scenes */}
                  <div className="space-y-3">
                    {script.scenes.map((scene, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-xl border border-border bg-card p-4 space-y-3"
                      >
                        <p className="text-xs font-display font-semibold text-primary uppercase tracking-wider">
                          Scene {scene.sceneNumber}
                        </p>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Film className="h-3 w-3" /> Image Prompt
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              onClick={() =>
                                copyToClipboard(scene.imagePrompt, `scene-img-${i}`)
                              }
                            >
                              {copiedField === `scene-img-${i}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2.5">
                            {scene.imagePrompt}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Mic className="h-3 w-3" /> Voiceover
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              onClick={() =>
                                copyToClipboard(scene.narration, `scene-nar-${i}`)
                              }
                            >
                              {copiedField === `scene-nar-${i}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-foreground italic bg-accent/30 rounded-lg p-2.5">
                            "{scene.narration}"
                          </p>
                          <SceneVoiceButton
                            sceneNumber={scene.sceneNumber}
                            narration={scene.narration}
                            voice={getSceneVoice(scene.sceneNumber)}
                            onVoiceChange={(v) => setSceneVoice(scene.sceneNumber, v)}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Full Narration */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                        Full Voiceover Script
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(script.fullNarration, "narration")
                        }
                      >
                        {copiedField === "narration" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {script.fullNarration}
                    </p>
                  </div>

                  {/* Copy Full Script */}
                  <Button
                    onClick={() => {
                      const full = `${script.title}\n\n${script.scenes.map(s => `Scene ${s.sceneNumber}:\nImage Prompt: ${s.imagePrompt}\nVoiceover: ${s.narration}`).join("\n\n")}\n\nFull Narration:\n${script.fullNarration}\n\nHashtags: ${script.hashtags?.map(t => `#${t}`).join(" ") || ""}`;
                      copyToClipboard(full, "full-script");
                    }}
                    variant="outline"
                    className="w-full h-11 font-display font-semibold"
                  >
                    {copiedField === "full-script" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copy Full Script
                  </Button>

                  <Button
                    onClick={usePromptsForImageGen}
                    className="w-full h-11 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity"
                  >
                    Use Prompts to Generate Images
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border border-dashed border-border bg-card/30"
                >
                  <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your video idea and hit generate
                    <br />
                    to get scene prompts & narration script
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ScriptGeneratorPage;
