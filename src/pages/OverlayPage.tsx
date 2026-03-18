import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Download, Loader2, Volume2, X, Film, Music, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import PlatformSelector from "@/components/animate/PlatformSelector";
import { type PlatformPreset, PLATFORM_PRESETS } from "@/components/animate/types";

interface AudioTrack {
  file: File;
  url: string;
  sceneIndex: number; // -1 means "all scenes" / full video
}

const OverlayPage = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [platform, setPlatform] = useState<PlatformPreset>("youtube");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [sceneCount, setSceneCount] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: "Please upload a video file", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setOutputUrl(null);

    // Get video duration to calculate scene splits
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(tempVideo.duration);
    };
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
    if (!videoFile || audioTracks.length === 0 || !videoRef.current) return;
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

      // Decode and schedule each audio track
      const sources: AudioBufferSourceNode[] = [];
      for (const track of audioTracks) {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);

        if (track.sceneIndex === -1) {
          // Full video
          source.start(0);
        } else {
          // Start at scene offset
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
        // Scale video to fit platform dimensions
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
  }, [videoFile, audioTracks, platform, videoDuration, sceneCount, toast]);

  const downloadOutput = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `sangi-overlay-${platform}-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Overlay Audio on Video
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Combine your video with multiple audio tracks. Assign each to a scene or the full video.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            {/* Video Upload */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" /> Upload Video
              </label>
              {videoUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <video src={videoUrl} className="w-full h-36 object-cover" />
                  <button
                    onClick={() => { setVideoFile(null); setVideoUrl(null); setOutputUrl(null); setVideoDuration(0); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-background/80 rounded px-2 py-0.5 text-xs text-foreground">
                    {videoFile?.name} {videoDuration > 0 && `(${Math.round(videoDuration)}s)`}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload video</span>
                  <span className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                </label>
              )}
            </div>

            {/* Scene Count */}
            {videoFile && (
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
            )}

            {/* Audio Tracks */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Music className="h-4 w-4 text-accent" /> Audio Tracks
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
                  {/* Scene assignment */}
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

            {/* Platform */}
            <PlatformSelector platform={platform} onChange={setPlatform} />

            {/* Combine Button */}
            <Button
              onClick={combineVideoAudio}
              disabled={!videoFile || audioTracks.length === 0 || isProcessing}
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
                  Combine Video + {audioTracks.length} Audio Track{audioTracks.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Audio tracks are mixed and overlaid. Output is browser-rendered — no server needed.
            </p>
          </motion.div>

          {/* Right: Output */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground text-sm">Output</h3>
                <span className="text-xs text-muted-foreground">
                  {PLATFORM_PRESETS[platform].width}×{PLATFORM_PRESETS[platform].height}
                </span>
              </div>
              <div
                className="bg-muted flex items-center justify-center"
                style={{
                  aspectRatio: platform === "tiktok" ? "9/16" : platform === "facebook" ? "1/1" : "16/9",
                  maxHeight: "480px",
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
                  <div className="text-center">
                    <Volume2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Upload video & audio to combine</p>
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
          </motion.div>
        </div>

        {/* Hidden video element for processing */}
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} className="hidden" preload="auto" playsInline />
        )}
      </main>
    </div>
  );
};

export default OverlayPage;
