import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, Film, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import ImageGallery from "@/components/animate/ImageGallery";
import PlatformSelector from "@/components/animate/PlatformSelector";
import { ANIMATION_STYLES, type AnimationStyle, type PlatformPreset } from "@/components/animate/types";
import { useVideoGenerator } from "@/components/animate/useVideoGenerator";
import AudioOverlaySection from "@/components/animate/AudioOverlaySection";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import { useWatermark } from "@/hooks/use-watermark";

const AnimatePage = () => {
  const [images, setImages] = usePersistedState<string[]>("sangi_anim_images", []);
  const [durations, setDurations] = usePersistedState<number[]>("sangi_anim_durations", []);
  const [styles, setStyles] = usePersistedState<AnimationStyle[]>("sangi_anim_styles", []);
  const [defaultStyle, setDefaultStyle] = usePersistedState<AnimationStyle>("sangi_anim_defaultStyle", "ken-burns");
  const [platform, setPlatform] = usePersistedState<PlatformPreset>("sangi_anim_platform", "youtube");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = usePersistedState<string | null>("sangi_anim_videoUrl", null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { generate } = useVideoGenerator(canvasRef);
  const { checkAndTrack } = useUsageLimit("image_to_video");
  const { watermarkEnabled } = useWatermark();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ title: "Please upload image files", variant: "destructive" });
      return;
    }
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
        setDurations((prev) => [...prev, 5]);
        setStyles((prev) => [...prev, defaultStyle]);
      };
      reader.readAsDataURL(file);
    });
    setVideoUrl(null);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setDurations((prev) => prev.filter((_, i) => i !== index));
    setStyles((prev) => prev.filter((_, i) => i !== index));
    setVideoUrl(null);
  };

  const handleDurationChange = (index: number, duration: number) => {
    setDurations((prev) => prev.map((d, i) => (i === index ? duration : d)));
  };

  const handleStyleChange = (index: number, style: AnimationStyle) => {
    setStyles((prev) => prev.map((s, i) => (i === index ? style : s)));
  };

  const totalDuration = durations.reduce((sum, d) => sum + d, 0);

  const handleGenerate = async () => {
    if (images.length === 0) return;
    const allowed = await checkAndTrack();
    if (!allowed) return;
    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const url = await generate(images, styles, durations, platform, watermarkEnabled);
      setVideoUrl(url);
      toast({ title: "Video generated successfully!" });
    } catch (err: any) {
      toast({ title: "Video generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `sangi-${platform}-${Date.now()}.webm`;
    a.click();
  };

  const handleClear = () => {
    setImages([]);
    setDurations([]);
    setStyles([]);
    setVideoUrl(null);
    setDefaultStyle("ken-burns");
    setPlatform("youtube");
    toast({ title: "Cleared all data" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Animate Still Images
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Upload images to create a cinematic slideshow. Set duration per image and choose your platform.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            <ImageGallery
              images={images}
              durations={durations}
              styles={styles}
              onAdd={handleImageUpload}
              onRemove={removeImage}
              onDurationChange={handleDurationChange}
              onStyleChange={handleStyleChange}
            />

            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">
                Default Style <span className="text-muted-foreground font-normal text-xs">(for new images)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setDefaultStyle(s.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      defaultStyle === s.value
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

            <PlatformSelector platform={platform} onChange={setPlatform} />

            {images.length > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                Total duration: {totalDuration}s across {images.length} image{images.length !== 1 ? "s" : ""}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={images.length === 0 || isGenerating}
                className="flex-1 h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Film className="h-5 w-5 mr-2" />
                    Generate Video ({images.length} image{images.length !== 1 ? "s" : ""})
                  </>
                )}
              </Button>
              {(images.length > 0 || videoUrl) && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground text-sm">Preview</h3>
                <span className="text-xs text-muted-foreground">
                  {platform === "youtube" ? "1920×1080" : platform === "tiktok" ? "1080×1920" : platform === "facebook" ? "1080×1080" : "1280×720"}
                </span>
              </div>
              <div
                className="bg-muted flex items-center justify-center"
                style={{
                  aspectRatio: platform === "tiktok" ? "9/16" : platform === "facebook" ? "1/1" : "16/9",
                  maxHeight: "480px",
                }}
              >
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : isGenerating ? (
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Rendering animation...</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Upload images and generate to preview</p>
                  </div>
                )}
              </div>
              {videoUrl && (
                <div className="p-4 border-t border-border">
                  <Button onClick={downloadVideo} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download for {platform === "youtube" ? "YouTube" : platform === "tiktok" ? "TikTok" : platform === "facebook" ? "Facebook" : "HD"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {videoUrl && (
          <AudioOverlaySection
            videoUrl={videoUrl}
            platform={platform}
            onPlatformChange={setPlatform}
          />
        )}
      </main>
    </div>
  );
};

export default AnimatePage;
