import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, ImageIcon, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EXAMPLE_PROMPTS = [
  "A cyberpunk city at night with neon lights reflecting on wet streets",
  "A golden retriever puppy sitting in a field of sunflowers at sunset",
  "An astronaut floating in space with Earth in the background, photorealistic",
  "A cozy cabin in a snowy mountain forest with warm light from windows",
];

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setImageUrl(null);
    setDescription("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        setDescription(data.description || "");
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: "png" | "jpg") => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      if (format === "jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, 0.95);

      const link = document.createElement("a");
      link.download = `sangi-ai-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();
    };
    img.src = imageUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Wand2 className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground tracking-tight">
              SangiAI
            </h1>
          </div>
          <span className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-muted">
            Text to Image
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Turn Words Into Stunning Images
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Describe any image and SangiAI will generate it for you instantly. Download in PNG or JPG.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">
                Your Prompt
              </label>
              <Textarea
                placeholder="Describe the image you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[140px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Be descriptive for better results — include style, lighting, colors, and mood.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Image
                </>
              )}
            </Button>

            {/* Example prompts */}
            <div className="space-y-2">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                Try these prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left"
                  >
                    {p.length > 50 ? p.substring(0, 50) + "…" : p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden min-h-[400px] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 p-8"
                  >
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl gradient-primary animate-pulse flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="absolute -inset-2 rounded-2xl border-2 border-primary/30 animate-ping" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-display font-semibold text-foreground">Creating your image…</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                    </div>
                  </motion.div>
                ) : imageUrl ? (
                  <motion.img
                    key="image"
                    ref={imageRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={imageUrl}
                    alt={prompt}
                    className="w-full h-auto object-contain max-h-[500px]"
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 p-8 text-center"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your generated image will appear here
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Download buttons */}
            {imageUrl && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Button
                  onClick={() => handleDownload("png")}
                  className="flex-1 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>
                <Button
                  onClick={() => handleDownload("jpg")}
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted font-display font-semibold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download JPG
                </Button>
              </motion.div>
            )}

            {description && (
              <p className="text-xs text-muted-foreground italic">{description}</p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Index;
