import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Download, Loader2, Volume2, X, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const OverlayPage = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
    setVideoUrl(URL.createObjectURL(file));
    setOutputUrl(null);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Please upload an audio file", variant: "destructive" });
      return;
    }
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setOutputUrl(null);
  };

  const combineVideoAudio = useCallback(async () => {
    if (!videoFile || !audioFile || !videoRef.current) return;
    setIsProcessing(true);
    setOutputUrl(null);

    try {
      const video = videoRef.current;
      video.muted = true;
      video.currentTime = 0;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d")!;

      const videoStream = canvas.captureStream(30);
      
      // Create audio context and source from audio file
      const audioCtx = new AudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      const dest = audioCtx.createMediaStreamDestination();
      audioSource.connect(dest);
      audioSource.start();

      // Combine video + audio tracks
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

      // Draw video frames to canvas
      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          audioSource.stop();
          audioCtx.close();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        recorder.stop();
        audioSource.stop();
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
  }, [videoFile, audioFile, toast]);

  const downloadOutput = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `sangi-overlay-${Date.now()}.webm`;
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
            Combine your video with any audio track — narration, music, or voiceover.
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
                    onClick={() => { setVideoFile(null); setVideoUrl(null); setOutputUrl(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-background/80 rounded px-2 py-0.5 text-xs text-foreground">
                    {videoFile?.name}
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

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Music className="h-4 w-4 text-accent" /> Upload Audio
              </label>
              {audioUrl ? (
                <div className="relative rounded-lg border border-border bg-card p-4">
                  <button
                    onClick={() => { setAudioFile(null); setAudioUrl(null); setOutputUrl(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <Volume2 className="h-5 w-5 text-accent" />
                    <span className="text-sm text-foreground truncate">{audioFile?.name}</span>
                  </div>
                  <audio src={audioUrl} controls className="w-full h-8" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors bg-card">
                  <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload audio</span>
                  <span className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </label>
              )}
            </div>

            {/* Combine Button */}
            <Button
              onClick={combineVideoAudio}
              disabled={!videoFile || !audioFile || isProcessing}
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
                  Combine Video + Audio
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              The audio will overlay the video. Output is browser-rendered — no server needed.
            </p>
          </motion.div>

          {/* Right: Output */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-foreground text-sm">Output</h3>
              </div>
              <div className="aspect-video bg-muted flex items-center justify-center">
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
                    Download Video (.webm)
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
