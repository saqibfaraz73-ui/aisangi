import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Music, Loader2, Play, Pause, Download, Edit3, Check, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useUsageLimit } from "@/hooks/use-usage-limit";

const EXAMPLE_PROMPTS = [
  "A calm acoustic folk song with a gentle guitar melody and soft strings, 90 bpm",
  "An energetic electronic dance track with a fast tempo and driving beat, featuring bright synths",
  "A cinematic orchestral piece with sweeping strings, dramatic brass, and timpani rolls",
  "Lo-fi hip-hop ambient music with mellow piano chords and vinyl crackle, relaxing mood",
  "An upbeat jazz track with piano, bass, and drums, 120 bpm, in C major",
];

const MusicGeneratorPage = () => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [fileName, setFileName] = useState("My_Music");
  const [editingName, setEditingName] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { checkLimit, trackUsage } = useUsageLimit("music_gen");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a music prompt", variant: "destructive" });
      return;
    }

    const allowed = await checkLimit();
    if (!allowed) return;

    setGenerating(true);
    setAudioUrl(null);
    if (audioEl) { audioEl.pause(); setIsPlaying(false); }

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const { data, error } = await supabase.functions.invoke("generate-music", {
        body: { prompt: prompt.trim(), negative_prompt: negativePrompt.trim() || undefined },
      });

      if (controller.signal.aborted) return;
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.audioContent) throw new Error("No audio returned");

      await trackUsage(data?.tokensUsed || 0);

      const mime = data.mimeType || "audio/wav";
      const url = `data:${mime};base64,${data.audioContent}`;
      setAudioUrl(url);
      toast({ title: "Music generated successfully!" });
    } catch (err: any) {
      if (!abortRef.current?.signal.aborted) {
        toast({
          title: "Music generation failed",
          description: err.message || "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
    if (audioEl) { audioEl.pause(); }
    toast({ title: "Generation cancelled" });
  };

  const togglePlay = () => {
    if (!audioUrl) return;
    if (isPlaying && audioEl) {
      audioEl.pause();
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setAudioEl(audio);
    setIsPlaying(true);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            AI Music Generator
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Generate ~30 second instrumental music clips using Google Lyria. Describe the genre, mood, tempo, and instruments.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          {/* Example prompts */}
          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">Try an example</label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate max-w-[250px]"
                >
                  {ex.slice(0, 50)}…
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">Music Prompt</label>
            <Textarea
              placeholder="Describe the music you want... e.g. 'A calm acoustic folk song with gentle guitar, 90 bpm'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">
              Negative Prompt <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="Elements to exclude, e.g. 'vocals, distorted guitar, excessive cymbal crashes'"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Music...
              </>
            ) : (
              <>
                <Music className="h-5 w-5 mr-2" />
                Generate Music
              </>
            )}
          </Button>

          {generating && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full h-10 border-destructive/30 text-destructive hover:bg-destructive/10 font-display font-semibold"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">Generated Music</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={togglePlay} className="gap-1.5">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">File name:</span>
                {editingName ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingName(false)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-1 text-xs text-foreground hover:text-primary transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    {fileName}.wav
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default MusicGeneratorPage;
