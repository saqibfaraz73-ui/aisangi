import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, Scissors, Upload, Play, Pause, Loader2 } from "lucide-react";

const VideoTrimmerPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState([0, 10]);
  const [playing, setPlaying] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResultUrl(null);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(v.duration);
      setRange([0, Math.min(v.duration, 30)]);
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [videoUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.currentTime = range[0]; v.play(); }
    setPlaying(!playing);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playing) return;
    const onTime = () => { if (v.currentTime >= range[1]) { v.pause(); setPlaying(false); } };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [playing, range]);

  const trimVideo = async () => {
    const v = videoRef.current;
    if (!v || !file) return;
    setTrimming(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);

      // Add audio
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(v);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch {}

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);

      await new Promise<void>(resolve => {
        recorder.onstop = () => resolve();
        v.currentTime = range[0];
        v.play();
        recorder.start();

        const drawFrame = () => {
          if (v.currentTime >= range[1] || v.paused) {
            recorder.stop();
            v.pause();
            return;
          }
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };
        v.onplaying = drawFrame;
      });

      const blob = new Blob(chunks, { type: "video/webm" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error("Trim failed", e);
    }
    setTrimming(false);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><Scissors className="h-5 w-5 text-primary" /> Video Trimmer</h2>
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{file ? file.name : "Upload a video"}</p>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {videoUrl && (
          <div className="space-y-3">
            <video ref={videoRef} src={videoUrl} className="w-full rounded-lg border border-border max-h-64" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={togglePlay}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              <span className="text-xs text-muted-foreground">{fmtTime(range[0])} – {fmtTime(range[1])}</span>
            </div>
            {duration > 0 && (
              <div>
                <Label>Trim Range</Label>
                <Slider
                  value={range}
                  onValueChange={v => setRange(v)}
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1">Duration: {fmtTime(range[1] - range[0])}</p>
              </div>
            )}
            <Button onClick={trimVideo} disabled={trimming} className="w-full">
              {trimming ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Trimming...</> : <><Scissors className="h-4 w-4 mr-1" />Trim Video</>}
            </Button>
          </div>
        )}
        {resultUrl && (
          <div className="space-y-3 text-center">
            <video src={resultUrl} controls className="w-full rounded-lg border border-border max-h-64" />
            <Button variant="outline" asChild><a href={resultUrl} download="trimmed.webm"><Download className="h-4 w-4 mr-1" />Download Trimmed Video</a></Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default VideoTrimmerPage;
