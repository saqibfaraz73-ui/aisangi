import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, Film, Play, Trash2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import ImageGallery from "@/components/animate/ImageGallery";
import PlatformSelector from "@/components/animate/PlatformSelector";
import AudioInputSection, { type AudioTrackInput } from "@/components/animate/AudioInputSection";
import { ANIMATION_STYLES, type AnimationStyle, type PlatformPreset, type MediaItem } from "@/components/animate/types";
import { useVideoGenerator } from "@/components/animate/useVideoGenerator";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import { useWatermark } from "@/hooks/use-watermark";

function extractVideoThumbnail(file: File): Promise<{ thumbnail: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve({ thumbnail, duration: Math.round(duration * 10) / 10 });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
  });
}

const AnimatePage = () => {
  const [items, setItems] = usePersistedState<MediaItem[]>("sangi_anim_items", []);
  const [defaultStyle, setDefaultStyle] = usePersistedState<AnimationStyle>("sangi_anim_defaultStyle", "ken-burns");
  const [platform, setPlatform] = usePersistedState<PlatformPreset>("sangi_anim_platform", "youtube");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = usePersistedState<string | null>("sangi_anim_videoUrl", null);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInput[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { generate } = useVideoGenerator(canvasRef);
  const { checkAndTrack } = useUsageLimit("image_to_video");
  const { watermarkEnabled, watermarkColor } = useWatermark();

  // We need to store video files separately since they can't be persisted as JSON
  const [videoFiles, setVideoFiles] = useState<Map<number, File>>(new Map());

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          setItems((prev) => [...prev, {
            type: "image",
            src,
            thumbnail: src,
            duration: 5,
            style: defaultStyle,
            fileName: file.name,
            audio: null,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        try {
          const { thumbnail, duration } = await extractVideoThumbnail(file);
          setItems((prev) => {
            const newIndex = prev.length;
            setVideoFiles((vf) => new Map(vf).set(newIndex, file));
            return [...prev, {
              type: "video",
              src: URL.createObjectURL(file),
              thumbnail,
              duration,
              style: "none",
              fileName: file.name,
              audio: null,
              videoFile: file,
            }];
          });
        } catch {
          toast({ title: `Failed to load video: ${file.name}`, variant: "destructive" });
        }
      }
    }
    setVideoUrl(null);
    e.target.value = "";
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item?.audio) URL.revokeObjectURL(item.audio.url);
    if (item?.type === "video") URL.revokeObjectURL(item.src);
    setItems((prev) => prev.filter((_, i) => i !== index));
    setVideoUrl(null);
  };

  const handleDurationChange = (index: number, duration: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, duration } : item));
  };

  const handleStyleChange = (index: number, style: AnimationStyle) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, style } : item));
  };

  const handleAudioChange = (index: number, file: File | null) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      if (item.audio) URL.revokeObjectURL(item.audio.url);
      return {
        ...item,
        audio: file ? { file, url: URL.createObjectURL(file) } : null,
      };
    }));
  };

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

  const handleGenerate = async () => {
    if (items.length === 0) return;
    const allowed = await checkAndTrack();
    if (!allowed) return;
    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const url = await generate(items, platform, watermarkEnabled, watermarkColor, audioTracks);
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
    items.forEach((item) => {
      if (item.audio) URL.revokeObjectURL(item.audio.url);
      if (item.type === "video") URL.revokeObjectURL(item.src);
    });
    setItems([]);
    setVideoUrl(null);
    setDefaultStyle("ken-burns");
    setPlatform("youtube");
    audioTracks.forEach((t) => URL.revokeObjectURL(t.url));
    setAudioTracks([]);
    setVideoFiles(new Map());
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
            Upload images or video clips to create a cinematic slideshow. Add voice per clip optionally.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            <ImageGallery
              items={items}
              onAdd={handleMediaUpload}
              onRemove={removeItem}
              onDurationChange={handleDurationChange}
              onStyleChange={handleStyleChange}
              onAudioChange={handleAudioChange}
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

            <AudioInputSection tracks={audioTracks} onTracksChange={setAudioTracks} />

            <PlatformSelector platform={platform} onChange={setPlatform} />

            {items.length > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                Total duration: {totalDuration.toFixed(1)}s across {items.length} clip{items.length !== 1 ? "s" : ""}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={items.length === 0 || isGenerating}
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
                    Generate Video ({items.length} clip{items.length !== 1 ? "s" : ""})
                  </>
                )}
              </Button>
              {(items.length > 0 || videoUrl) && (
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
                    <p className="text-sm text-muted-foreground">Upload media and generate to preview</p>
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
      </main>
    </div>
  );
};

export default AnimatePage;
