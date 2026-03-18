import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import CharacterUpload from "@/components/CharacterUpload";
import SceneCountSelector from "@/components/SceneCountSelector";
import ImageResults from "@/components/ImageResults";
import AppHeader from "@/components/AppHeader";
import { usePersistedState } from "@/hooks/use-persisted-state";

const EXAMPLE_PROMPTS = [
  "A cyberpunk city at night with neon lights reflecting on wet streets",
  "A golden retriever puppy sitting in a field of sunflowers at sunset",
  "An astronaut floating in space with Earth in the background, photorealistic",
  "A cozy cabin in a snowy mountain forest with warm light from windows",
];

interface ImageResult {
  imageUrl: string;
  description?: string;
}

const Index = () => {
  const [prompt, setPrompt] = usePersistedState("sangi_prompt", "");
  const [images, setImages] = usePersistedState<ImageResult[]>("sangi_images", []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [characterImages, setCharacterImages] = usePersistedState<string[]>("sangi_characters", []);
  const [sceneCount, setSceneCount] = usePersistedState("sangi_sceneCount", 1);
  const { toast } = useToast();
  const { checkAndTrack } = useUsageLimit("text_to_image");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    const allowed = await checkAndTrack();
    if (!allowed) return;

    setIsGenerating(true);
    setImages([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          characterImageUrls: characterImages.length > 0 ? characterImages : undefined,
          sceneCount,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.images?.length) {
        setImages(data.images);
      } else if (data?.imageUrl) {
        setImages([{ imageUrl: data.imageUrl, description: data.description }]);
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

  const handleClear = () => {
    setPrompt("");
    setImages([]);
    setCharacterImages([]);
    setSceneCount(1);
    toast({ title: "Cleared all data" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Turn Words Into Stunning Images
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Describe any image, upload your selfie as an AI character, and generate multiple scene variations.
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
            <CharacterUpload
              characterImages={characterImages}
              onCharacterImagesChange={setCharacterImages}
            />

            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">
                Your Prompt
              </label>
              <Textarea
                placeholder={
                  characterImage
                    ? "Describe the scene... e.g. 'playing football in a stadium'"
                    : "Describe the image you want to create..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                {characterImage
                  ? "Your AI character will be placed in the scene you describe."
                  : "Be descriptive — include style, lighting, colors, and mood."}
              </p>
            </div>

            <SceneCountSelector count={sceneCount} onChange={setSceneCount} />

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating {sceneCount > 1 ? `${sceneCount} scenes` : ""}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate {sceneCount > 1 ? `${sceneCount} Scenes` : "Image"}
                  </>
                )}
              </Button>
              {(images.length > 0 || prompt || characterImage) && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

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

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ImageResults
              images={images}
              isGenerating={isGenerating}
              prompt={prompt}
              sceneCount={sceneCount}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Index;
