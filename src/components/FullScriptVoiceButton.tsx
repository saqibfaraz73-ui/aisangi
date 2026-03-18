import { useState } from "react";
import { Volume2, Download, Loader2, Play, Pause, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import { useElevenLabsVoice } from "@/hooks/use-elevenlabs-voice";
import { VOICES } from "@/components/SceneVoiceButton";

interface FullScriptVoiceButtonProps {
  fullNarration: string;
  title: string;
}

const FullScriptVoiceButton = ({ fullNarration, title }: FullScriptVoiceButtonProps) => {
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [voice, setVoice] = useState("Kore");
  const [fileName, setFileName] = useState(() => {
    const safeName = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
    return safeName ? `${safeName}_Full_Voice` : "Full_Script_Voice";
  });
  const [editingName, setEditingName] = useState(false);
  const { toast } = useToast();
  const { checkLimit, trackUsage } = useUsageLimit("voice_tts");
  const elevenLabs = useElevenLabsVoice();

  const handleGenerate = async () => {
    if (!fullNarration.trim()) return;

    const allowed = await checkLimit();
    if (!allowed) return;

    setGenerating(true);
    try {
      const isClone = voice === "__clone__";
      const fnName = isClone ? "generate-voice-elevenlabs" : "generate-voice";
      const body = isClone ? { text: fullNarration } : { text: fullNarration, voice };
      const { data, error } = await supabase.functions.invoke(fnName, { body });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.audioContent) throw new Error("No audio returned");

      await trackUsage(data?.tokensUsed || 0);

      const mime = isClone ? "audio/mpeg" : "audio/wav";
      const url = `data:${mime};base64,${data.audioContent}`;
      setAudioUrl(url);
      toast({ title: "Full script voice generated!" });
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
    const ext = voice === "__clone__" ? "mp3" : "wav";
    a.download = `${fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <p className="text-xs font-display font-semibold text-primary uppercase tracking-wider">
        🎙️ Generate Full Script Voice
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {elevenLabs.enabled && (
              <SelectItem value="__clone__" className="text-xs font-semibold text-primary">
                🎤 {elevenLabs.voiceName}
              </SelectItem>
            )}
            {VOICES.map((v) => (
              <SelectItem key={v.value} value={v.value} className="text-xs">
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="h-9 text-xs gap-1.5 gradient-accent text-accent-foreground font-display font-semibold hover:opacity-90"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              Generate Full Voice
            </>
          )}
        </Button>
      </div>

      {audioUrl && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={togglePlay} className="h-8 gap-1 text-xs">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 gap-1 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>

          {editingName ? (
            <div className="flex items-center gap-1 flex-1 min-w-[150px]">
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
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              {fileName}.wav
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default FullScriptVoiceButton;
