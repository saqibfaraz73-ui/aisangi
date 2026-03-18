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

const VOICES = [
  { value: "Kore", label: "Kore (Female, Warm)" },
  { value: "Aoede", label: "Aoede (Female, Bright)" },
  { value: "Leda", label: "Leda (Female, Gentle)" },
  { value: "Puck", label: "Puck (Male, Energetic)" },
  { value: "Charon", label: "Charon (Male, Deep)" },
  { value: "Fenrir", label: "Fenrir (Male, Strong)" },
  { value: "Zephyr", label: "Zephyr (Neutral)" },
  { value: "Orus", label: "Orus (Male, Clear)" },
  { value: "Perseus", label: "Perseus (Male, Heroic)" },
  { value: "Schedar", label: "Schedar (Female, Rich)" },
  { value: "Vega", label: "Vega (Female, Smooth)" },
];

interface SceneVoiceButtonProps {
  sceneNumber: number;
  narration: string;
  voice: string;
  onVoiceChange: (voice: string) => void;
}

const SceneVoiceButton = ({ sceneNumber, narration, voice, onVoiceChange }: SceneVoiceButtonProps) => {
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [fileName, setFileName] = useState(`Scene_${sceneNumber}_Voice`);
  const [editingName, setEditingName] = useState(false);
  const { toast } = useToast();
  const { checkLimit, trackUsage } = useUsageLimit("voice_tts");
  const elevenLabs = useElevenLabsVoice();

  const handleGenerate = async () => {
    if (!narration.trim()) return;

    const allowed = await checkLimit();
    if (!allowed) return;

    setGenerating(true);
    try {
      const isClone = voice === "__clone__";
      const fnName = isClone ? "generate-voice-elevenlabs" : "generate-voice";
      const body = isClone ? { text: narration } : { text: narration, voice };
      const { data, error } = await supabase.functions.invoke(fnName, { body });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.audioContent) throw new Error("No audio returned");

      await trackUsage(data?.tokensUsed || 0);

      const mime = isClone ? "audio/mpeg" : "audio/wav";
      const url = `data:${mime};base64,${data.audioContent}`;
      setAudioUrl(url);
      toast({ title: `Scene ${sceneNumber} voice generated!` });
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
      className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={voice} onValueChange={onVoiceChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
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
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={generating}
          className="h-8 text-xs gap-1"
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
          {generating ? "Generating..." : "Generate Voice"}
        </Button>

        {audioUrl && (
          <>
            <Button size="sm" variant="ghost" onClick={togglePlay} className="h-8 w-8 p-0">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {audioUrl && (
        <div className="flex items-center gap-2">
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

export { SceneVoiceButton, VOICES };
