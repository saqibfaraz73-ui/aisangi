import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Loader2, Play, Pause, Download, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { VOICES } from "@/components/SceneVoiceButton";
import { useUsageLimit } from "@/hooks/use-usage-limit";

const VoiceGeneratorPage = () => {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Kore");
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [fileName, setFileName] = useState("My_Voice");
  const [editingName, setEditingName] = useState(false);
  const { toast } = useToast();
  const { checkLimit, trackUsage } = useUsageLimit("voice_tts");

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({ title: "Please enter some text", variant: "destructive" });
      return;
    }

    const allowed = await checkLimit();
    if (!allowed) return;

    setGenerating(true);
    setAudioUrl(null);
    if (audioEl) { audioEl.pause(); setIsPlaying(false); }

    try {
      const { data, error } = await supabase.functions.invoke("generate-voice", {
        body: { text: text.trim(), voice },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.audioContent) throw new Error("No audio returned");

      await trackUsage(data?.tokensUsed || 0);

      const url = `data:audio/wav;base64,${data.audioContent}`;
      setAudioUrl(url);
      toast({ title: "Voice generated successfully!" });
    } catch (err: any) {
      toast({
        title: "Voice generation failed",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            AI Voice Generator
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Convert any text to natural-sounding speech using Gemini AI. Preview and download as WAV.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">
              Your Text
            </label>
            <Textarea
              placeholder="Enter the text you want to convert to speech..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[150px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground flex justify-between">
              <span>Supports up to 5000 characters</span>
              <span className={text.length > 5000 ? "text-destructive" : ""}>{text.length}/5000</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">
              Voice
            </label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !text.trim() || text.length > 5000}
            className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Voice...
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5 mr-2" />
                Generate Voice
              </>
            )}
          </Button>

          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">Generated Audio</h3>
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

export default VoiceGeneratorPage;
