import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Play, Download, Loader2, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

type AnimationStyle = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "pan-up" | "ken-burns" | "drift" | "dramatic-zoom";

const ANIMATION_STYLES: { value: AnimationStyle; label: string; desc: string }[] = [
  { value: "zoom-in", label: "Zoom In", desc: "Smooth zoom into focal point" },
  { value: "zoom-out", label: "Zoom Out", desc: "Reveal zoom from center" },
  { value: "pan-left", label: "Pan Left", desc: "Cinematic horizontal sweep" },
  { value: "pan-right", label: "Pan Right", desc: "Reverse horizontal sweep" },
  { value: "pan-up", label: "Pan Up", desc: "Vertical rise reveal" },
  { value: "ken-burns", label: "Ken Burns", desc: "Classic zoom + drift combo" },
  { value: "drift", label: "Drift", desc: "Gentle diagonal float" },
  { value: "dramatic-zoom", label: "Dramatic", desc: "Fast zoom with slow ease" },
];

const AnimatePage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [style, setStyle] = useState<AnimationStyle>("ken-burns");
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    setVideoUrl(null);
  };

  const generateVideo = useCallback(async () => {
    if (!image || !canvasRef.current) return;
    setIsGenerating(true);
    setVideoUrl(null);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = image;
      });

      const W = 1280;
      const H = 720;
      canvas.width = W;
      canvas.height = H;

      const fps = 30;
      const totalFrames = duration * fps;

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
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

      for (let frame = 0; frame < totalFrames; frame++) {
        const t = frame / totalFrames;
        // Eased progress for smoother motion
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        ctx.clearRect(0, 0, W, H);
        ctx.save();

        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        const aspect = W / H;
        const imgAspect = img.width / img.height;

        let drawW = img.width, drawH = img.height;
        if (imgAspect > aspect) {
          drawH = img.height;
          drawW = drawH * aspect;
        } else {
          drawW = img.width;
          drawH = drawW / aspect;
        }

        const maxOffsetX = img.width - drawW;
        const maxOffsetY = img.height - drawH;

        switch (style) {
          case "zoom-in": {
            const scale = 1 + eased * 0.35;
            const cw = drawW / scale;
            const ch = drawH / scale;
            sx = (img.width - cw) / 2;
            sy = (img.height - ch) / 2;
            sw = cw; sh = ch;
            break;
          }
          case "zoom-out": {
            const scale = 1.35 - eased * 0.35;
            const cw = drawW / scale;
            const ch = drawH / scale;
            sx = (img.width - cw) / 2;
            sy = (img.height - ch) / 2;
            sw = cw; sh = ch;
            break;
          }
          case "pan-left": {
            sx = maxOffsetX * (1 - eased);
            sy = (img.height - drawH) / 2;
            sw = drawW; sh = drawH;
            break;
          }
          case "pan-right": {
            sx = maxOffsetX * eased;
            sy = (img.height - drawH) / 2;
            sw = drawW; sh = drawH;
            break;
          }
          case "pan-up": {
            sx = (img.width - drawW) / 2;
            sy = maxOffsetY * (1 - eased);
            sw = drawW; sh = drawH;
            break;
          }
          case "ken-burns": {
            const scale = 1 + eased * 0.3;
            const cw = drawW / scale;
            const ch = drawH / scale;
            sx = (img.width - cw) * eased * 0.4;
            sy = (img.height - ch) * (1 - eased) * 0.4;
            sw = cw; sh = ch;
            break;
          }
          case "drift": {
            const scale = 1 + eased * 0.15;
            const cw = drawW / scale;
            const ch = drawH / scale;
            sx = (img.width - cw) * eased * 0.6;
            sy = (img.height - ch) * eased * 0.4;
            sw = cw; sh = ch;
            break;
          }
          case "dramatic-zoom": {
            // Fast start, slow end with cubic ease-out
            const dramatic = 1 - Math.pow(1 - t, 3);
            const scale = 1 + dramatic * 0.5;
            const cw = drawW / scale;
            const ch = drawH / scale;
            sx = (img.width - cw) / 2;
            sy = (img.height - ch) / 2;
            sw = cw; sh = ch;
            break;
          }
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        ctx.restore();

        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      recorder.stop();
      await done;

      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      toast({ title: "Video generated successfully!" });
    } catch (err: any) {
      toast({
        title: "Video generation failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [image, style, duration, toast]);

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `sangi-animated-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Animate Still Images
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Upload any image and turn it into a cinematic video with camera motion effects.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">Upload Image</label>
              {image ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={image} alt="Uploaded" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => { setImage(null); setVideoUrl(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-card">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload an image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            {/* Animation Style */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">Animation Style</label>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      style === s.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="text-sm font-semibold block">{s.label}</span>
                    <span className="text-xs opacity-70">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">Duration</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      duration === d
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <Button
              onClick={generateVideo}
              disabled={!image || isGenerating}
              className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Film className="h-5 w-5 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </motion.div>

          {/* Right: Preview */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-foreground text-sm">Preview</h3>
              </div>
              <div className="aspect-video bg-muted flex items-center justify-center">
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : isGenerating ? (
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Rendering animation...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Upload an image and generate to preview</p>
                  </div>
                )}
              </div>
              {videoUrl && (
                <div className="p-4 border-t border-border">
                  <Button onClick={downloadVideo} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video (.webm)
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Hidden canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
};

export default AnimatePage;
