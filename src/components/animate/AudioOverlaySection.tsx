import { useState, useRef, useCallback } from "react";
import { Download, Loader2, Volume2, X, Music, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PlatformSelector from "./PlatformSelector";
import { type PlatformPreset, PLATFORM_PRESETS } from "./types";

interface AudioTrack {
  file: File;
  url: string;
  sceneIndex: number;
}

interface AudioOverlaySectionProps {
  videoUrl: string;
  platform: PlatformPreset;
  onPlatformChange: (p: PlatformPreset) => void;
}

const AudioOverlaySection = ({ videoUrl, platform, onPlatformChange }: AudioOverlaySectionProps) => {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [sceneCount, setSceneCount] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Get duration from the generated video
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Please upload an audio file", variant: "destructive" });
      return;
    }
    setAudioTracks((prev) => [
      ...prev,
      { file, url: URL.createObjectURL(file), sceneIndex: -1 },
    ]);
    setOutputUrl(null);
    e.target.value = "";
  };

  const removeAudioTrack = (index: number) => {
    setAudioTracks((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
    setOutputUrl(null);
  };

  const setTrackScene = (trackIndex: number, sceneIndex: number) => {
    setAudioTracks((prev) =>
      prev.map((t, i) => (i === trackIndex ? { ...t, sceneIndex } : t))
    );
  };

  const combineVideoAudio = useCallback(async () => {
    if (audioTracks.length === 0 || !videoRef.current) return;
    setIsProcessing(true);
    setOutputUrl(null);

    try {
      const video = videoRef.current;
      video.muted = true;
      video.currentTime = 0;
      await video.play();

      const preset = PLATFORM_PRESETS[platform];
      const canvas = document.createElement("canvas");
      canvas.width = preset.width;
      canvas.height = preset.height;
      const ctx = canvas.getContext("2d")!;

      const videoStream = canvas.captureStream(30);
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      const sceneDuration = videoDuration / sceneCount;

      const sources: AudioBufferSourceNode[] = [];
      for (const track of audioTracks) {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);

        if (track.sceneIndex === -1) {
          source.start(0);
        } else {
          const startTime = track.sceneIndex * sceneDuration;
          source.start(startTime);
        }
        sources.push(source);
      }

      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(combined, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          sources.forEach((s) => { try { s.stop(); } catch {} });
          audioCtx.close();
          return;
        }
        const vw = video.videoWidth || preset.width;
        const vh = video.videoHeight || preset.height;
        const scale = Math.min(preset.width / vw, preset.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, preset.width, preset.height);
        ctx.drawImage(video, (preset.width - dw) / 2, (preset.height - dh) / 2, dw, dh);
        requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        recorder.stop();
        sources.forEach((s) => { try { s.stop(); } catch {} });
        audioCtx.close();
      };

      drawFrame();
      await done;

      const blob = new Blob(chunks, { type: "video/webm" });
      setOutputUrl(URL.createObjectURL(blob));
      toast({ title: "Video with audio created!" });
    } catch (err: any) {
      toast({
        title: "Processing failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [audioTracks, platform, videoDuration, sceneCount, toast]);

  const downloadOutput = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `sangi-overlay-${platform}-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-6 border-t border-border">
        <Music className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-xl text-foreground">Add Audio Overlay</h2>
        <span className="text-xs text-muted-foreground">— use your generated video directly</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Audio controls */}
        <div className="space-y-4">
          {/* Generated video preview */}
          <div className="rounded-lg overflow-hidden border border-border">
            <video src={videoUrl} className="w-full h-32 object-cover" />
            <div className="px-3 py-1.5 bg-card border-t border-border text-xs text-muted-foreground">
              Generated video {videoDuration > 0 && `(${Math.round(videoDuration)}s)`}
            </div>
          </div>

          {/* Scene Count */}
          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground">
              Number of Scenes
              {videoDuration > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  (~{Math.round(videoDuration / sceneCount)}s each)
                </span>
              )}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSceneCount(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    sceneCount === n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Tracks */}
          <div className="space-y-2">
            <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-accent" /> Audio Tracks
              <span className="text-muted-foreground font-normal">({audioTracks.length} added)</span>
            </label>

            {audioTracks.map((track, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{track.file.name}</span>
                  <button
                    onClick={() => removeAudioTrack(i)}
                    className="h-6 w-6 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <audio src={track.url} controls className="w-full h-8" />
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setTrackScene(i, -1)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      track.sceneIndex === -1
                        ? "bg-primary/20 text-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Full Video
                  </button>
                  {Array.from({ length: sceneCount }, (_, s) => (
                    <button
                      key={s}
                      onClick={() => setTrackScene(i, s)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        track.sceneIndex === s
                          ? "bg-primary/20 text-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Scene {s + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <label className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors bg-card">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add audio track</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
            </label>
          </div>

          <Button
            onClick={combineVideoAudio}
            disabled={audioTracks.length === 0 || isProcessing}
            className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5 mr-2" />
                Combine with {audioTracks.length} Audio Track{audioTracks.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>

        {/* Right: Output */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground text-sm">Audio + Video Output</h3>
            <span className="text-xs text-muted-foreground">
              {PLATFORM_PRESETS[platform].width}×{PLATFORM_PRESETS[platform].height}
            </span>
          </div>
          <div
            className="bg-muted flex items-center justify-center"
            style={{
              aspectRatio: platform === "tiktok" ? "9/16" : platform === "facebook" ? "1/1" : "16/9",
              maxHeight: "400px",
            }}
          >
            {outputUrl ? (
              <video src={outputUrl} controls autoPlay className="w-full h-full object-contain" />
            ) : isProcessing ? (
              <div className="text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Combining video and audio...</p>
              </div>
            ) : (
              <div className="text-center p-4">
                <Volume2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Add audio tracks and combine</p>
              </div>
            )}
          </div>
          {outputUrl && (
            <div className="p-4 border-t border-border">
              <Button onClick={downloadOutput} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download for {PLATFORM_PRESETS[platform].label}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden video for processing */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        preload="auto"
        playsInline
        onLoadedMetadata={handleVideoLoaded}
      />
    </div>
  );
};

export default AudioOverlaySection;
