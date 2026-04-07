import { useRef, useState, useEffect } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Trash2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import CharacterUpload from "@/components/CharacterUpload";

import ImageResults from "@/components/ImageResults";
import AppHeader from "@/components/AppHeader";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { GENERAL_PROMPTS, CHARACTER_PROMPTS } from "@/data/prompts";


interface ImageResult {
  imageUrl: string;
  description?: string;
}

const extractFunctionErrorMessage = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Try again.";
};

const Index = () => {
  const [prompt, setPrompt] = usePersistedState("sangi_prompt", "");
  const [images, setImages] = usePersistedState<ImageResult[]>("sangi_images", []);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [characterImages, setCharacterImages] = usePersistedState<string[]>("sangi_characters", []);
  
  const { toast } = useToast();
  const { checkLimit, trackUsage, getRemainingUses } = useUsageLimit("text_to_image");

  // Pick up prompt from Prompt Generator page
  useEffect(() => {
    const incoming = sessionStorage.getItem("sangi_use_prompt");
    if (incoming) {
      setPrompt(incoming);
      sessionStorage.removeItem("sangi_use_prompt");
    }
  }, []);

  const handleGenerate = async () => {
    if (generationInFlightRef.current || isGenerating) return;

    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    generationInFlightRef.current = true;
    setIsGenerating(true);
    setImages([]);

    try {
      const allowed = await checkLimit();
      if (!allowed) return;

      const remaining = await getRemainingUses();
      const actualCount = 1;
      if (remaining <= 0) {
        toast({ title: "Usage limit reached", description: "You have no remaining uses. Try again later.", variant: "destructive" });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          characterImageUrls: characterImages.length > 0 ? characterImages : undefined,
          sceneCount: actualCount,
        },
      });

      if (controller.signal.aborted) return;

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedImages = data?.images?.length ? data.images : data?.imageUrl ? [{ imageUrl: data.imageUrl, description: data.description }] : [];
      if (generatedImages.length === 0) throw new Error("No image returned");

      // Track usage for EACH image generated
      for (let i = 0; i < generatedImages.length; i++) {
        const tokensPerImage = Math.ceil((data?.tokensUsed || 0) / generatedImages.length);
        await trackUsage(tokensPerImage);
      }

      setImages(generatedImages);
    } catch (err) {
      const description = await extractFunctionErrorMessage(err);
      toast({
        title: "Generation failed",
        description,
        variant: "destructive",
      });
    } finally {
      generationInFlightRef.current = false;
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationInFlightRef.current = false;
    setIsGenerating(false);
    toast({ title: "Generation cancelled" });
  };

  const handleClear = () => {
    setPrompt("");
    setImages([]);
    setCharacterImages([]);
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

        <div className="space-y-6">
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
                  characterImages.length > 0
                    ? characterImages.length > 1
                      ? "Describe the scene with Person 1, Person 2... e.g. 'Person 1 and Person 2 playing football'"
                      : "Describe the scene... e.g. 'playing football in a stadium'"
                    : "Describe the image you want to create..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                {characterImages.length > 1
                  ? "Reference each person as Person 1, Person 2, etc. in your prompt."
                  : characterImages.length === 1
                    ? "Your AI character will be placed in the scene you describe."
                    : "Be descriptive — include style, lighting, colors, and mood."}
              </p>
              <p className="text-xs text-muted-foreground">
                Generate first, then use <span className="font-medium text-foreground">Resize</span> under the result for Facebook cover, passport, or custom sizes.
              </p>
            </div>


            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
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
              {isGenerating && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Square className="h-4 w-4" />
                </Button>
              )}
              {(images.length > 0 || prompt || characterImages.length > 0) && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(images.length > 0 || isGenerating) && (
              <ImageResults
                images={images}
                isGenerating={isGenerating}
                prompt={prompt}
                sceneCount={1}
              />
            )}

            <div className="space-y-3">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                {characterImages.length > 0 ? "Try these scene prompts" : "Try these prompts"}
              </p>
              {characterImages.length > 0 ? (
                <div className="space-y-2">
                  {CHARACTER_PROMPTS.map((cat) => (
                    <div key={cat.category}>
                      <p className="text-xs font-semibold text-foreground mb-1">{cat.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.prompts.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(p)}
                            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {GENERAL_PROMPTS.map((cat) => (
                    <div key={cat.category}>
                      <p className="text-xs font-semibold text-foreground mb-1">{cat.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.prompts.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(p)}
                            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Index;
