import { useRef } from "react";
import { Volume2, X, Plus, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface AudioTrackInput {
  file: File;
  url: string;
}

interface AudioInputSectionProps {
  tracks: AudioTrackInput[];
  onTracksChange: (tracks: AudioTrackInput[]) => void;
}

const AudioInputSection = ({ tracks, onTracksChange }: AudioInputSectionProps) => {
  const { toast } = useToast();

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Please upload an audio file", variant: "destructive" });
      return;
    }
    onTracksChange([...tracks, { file, url: URL.createObjectURL(file) }]);
    e.target.value = "";
  };

  const removeTrack = (index: number) => {
    URL.revokeObjectURL(tracks[index].url);
    onTracksChange(tracks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Music className="h-4 w-4 text-primary" />
        Background Audio
        <span className="text-muted-foreground font-normal text-xs">(optional)</span>
      </label>

      {tracks.map((track, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{track.file.name}</span>
            <button
              onClick={() => removeTrack(i)}
              className="h-6 w-6 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <audio src={track.url} controls className="w-full h-8" />
        </div>
      ))}

      <label className="flex items-center justify-center gap-2 h-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors bg-card">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Add audio track</span>
        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
      </label>
    </div>
  );
};

export default AudioInputSection;
