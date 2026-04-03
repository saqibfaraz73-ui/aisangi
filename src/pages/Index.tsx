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

const GENERAL_PROMPTS = [
  // Trending AI
  { category: "🔥 Trending AI", prompts: [
    "A serene portrait of a woman with long dark wavy hair walking in a garden, wearing a light-colored off-the-shoulder top with puff sleeves, holding a white flower, surrounded by various flowers plants and roses, soft diffused lighting, high-resolution natural quality",
    "A vibrant indoor lifestyle photo of a young female sitting in a circular wooden nook on wall with hanging plants and neon lights, wearing a colorful pink rose full sleeve sweatshirt, light white trousers, white Apple Watch, chunky white sports shoes, full body view, casual relaxed pose, bright soft lighting, cozy modern cafe vibe with flowers in background",
    "A beautiful and elegant young woman with long dark straight hair with subtle curls, cascaded over one shoulder, wearing a flowing floor-length fancy red dress with long sleeves and matching blue high heels, sitting gracefully on an ornate shell-shaped swing decorated with interwoven white string lights and elegant gold accents, luxurious and festive feel",
    "A hyper-realistic portrait captured in close-up at a tilted 45-degree angle, waist-length very long brown voluminous hair flowing freely, a few thin soft strands drifting across the face, long curled eyelashes, lips in a gentle deep red shade giving a dreamy sweetness, wearing a full traditional black net lehenga, cinematic lighting",
    "Ultra-realistic 8K full-body portrait, wearing a clean pressed white dress shirt with turned-up collar and small lapel microphone, dark navy blue trousers, polished brown dress shoes, casually leaning against a smooth light gray studio wall, hands in pockets, one leg crossed over the other, relaxed and confident body language, minimalist modern style",
    "A high-quality, cinematic portrait of a stylish young man with wavy brown hair and a groomed beard, wearing dark black sunglasses and a premium maroon (burgundy) trench coat. He is leaning out of the window of a sleek white luxury car, resting his chin on his hands. He is holding a bouquet of fresh red roses wrapped in brown craft paper. The lighting is soft and natural, with a shallow depth of field (blurred background). The vibe is romantic, modern, and sophisticated.",
    "Use my face and create a full-body photo of a man neon pastel tone shalwar kameez with a collar neck, full sleeves with cuffs, and metallic buttons. The garment has a round bottom and is a classic, modern essential style. The man has a beard and is wearing a silver watch on his left wrist. The background is a blurred, dark outdoor setting with warm streetlights at night, focusing on the man also wear dark rectangular sunglasses also up his sleeves and his head his down.",
    "A cute little boy holding a transparent umbrella standing on a wet city street at night in the rain, wearing a maroon button-up shirt and white sneakers with a smartwatch, bokeh city lights reflecting on wet ground, cinematic 4K photography, hyper-realistic portrait",
    "A young couple standing together in a park with pink flower petals falling, the man wearing a dark purple hoodie and the girl wearing a lavender purple hoodie, both in black pants and sneakers, soft blurred green background with pink flowers, romantic AI portrait, full body shot",
    "A young man standing with arms crossed in front of a large pencil sketch portrait of himself on a white canvas, wearing a black hoodie and gray trousers, realistic mixed-media art style, creative self-portrait concept",
    "A stylish man wearing a gray traditional shalwar kameez with a matching gray shawl draped over his shoulder, dark sunglasses, silver watch, standing on metal stairs outside a modern building with dark brick walls and red wooden door, confident urban fashion photography",
    "Ultra-realistic cinematic portrait of a young man standing on a rocky seashore while powerful ocean waves splash against him. Arms wide open, head tilted slightly back, eyes closed, expressing emotion and freedom. Medium hair blowing in wind, natural skin tone unchanged. Wearing black T-shirt with open black shirt/jacket. Waves detailed with sharp droplets. Dramatic teal-blue cloudy sky. Low-angle 4K shot with strong dynamic range.",
    "Create a hyper-realistic and 8k high definition texture portrait of a young man, seated at an outdoor cafe table, enjoy his single cup of tea, He has a dark beard and hair, and wearing a sunglasses. He is dressed in a light beige suit jacket over a white shirt, paired with white trousers. a watch and bracelet are visible on his wrist. He is sitting, facing slightly to his right, in a relaxed pose. The background is softly blurred, The lighting appears to be natural daylight, creating a sophisticated and relaxed atmosphere. The composition includes the back of the chair in the foreground, with the subject positioned mostly in the center. captured with an 85mm Lens f/1.8",
    "A romantic couple portrait sitting on a sofa, the woman wearing a pink floral printed outfit with a matching pink dupatta, the man in a black t-shirt behind her, warm indoor lighting with a floor lamp and curtains in the background, cinematic soft focus, hyper-realistic AI generated couple photo",
    "A mysterious dark portrait of a young man in a black t-shirt surrounded by dark smoke and shadows, with glowing demon eyes appearing in the smoke above him, moody dramatic lighting, dark fantasy concept art, cinematic horror aesthetic",
  ]},
  // General
  { category: "🎨 General", prompts: [
    "A cyberpunk city at night with neon lights reflecting on wet streets",
    "A golden retriever puppy sitting in a field of sunflowers at sunset",
    "An astronaut floating in space with Earth in the background, photorealistic",
    "A cozy cabin in a snowy mountain forest with warm light from windows",
  ]},
  // Eid Mubarak - English
  { category: "🌙 Eid Mubarak (English)", prompts: [
    "Eid Mubarak greeting card with golden crescent moon and lanterns, elegant calligraphy, festive bokeh lights",
    "Beautiful Eid ul Fitr celebration scene with mosque silhouette at sunset, flying lanterns, warm golden tones",
    "Eid Mubarak floral design with roses, crescent moon, and stars on a royal blue background",
    "Happy Eid celebration with family gathering around a festive table, warm lighting, joyful atmosphere",
    "Elegant Eid Mubarak card with 3D golden text, hanging lanterns, and sparkling stars on dark background",
  ]},
  // Eid Mubarak - Urdu
  { category: "🌙 عید مبارک (Urdu)", prompts: [
    "عید مبارک beautiful greeting card with golden crescent moon, lanterns, and Urdu calligraphy on dark green background",
    "عید الفطر مبارک elegant design with mosque, stars, and Nastaliq calligraphy, royal purple and gold theme",
    "آپکو اور آپکی فیملی کو عید مبارک festive card with floral border, crescent moon, warm golden lighting",
    "عید مبارک ہو Urdu calligraphy on a beautiful background with hanging lanterns and bokeh lights",
    "چاند مبارک beautiful moon sighting celebration card with Urdu text, night sky, crescent moon and stars",
  ]},
  // Cinematic
  { category: "🎬 Cinematic", prompts: [
    "A lone warrior standing on a rooftop at golden hour, cinematic lighting, dramatic sky, film grain, 35mm lens",
    "Walking through fog in a dimly lit alley, neon signs reflecting on wet ground, moody cinematic scene",
    "Close-up portrait with dramatic side lighting, shallow depth of field, cinematic color grading",
  ]},
  // Wedding
  { category: "💒 Wedding", prompts: [
    "Elegant wedding ceremony in a beautiful garden with soft bokeh lights, romantic sunset",
    "A floral wedding arch with rose petals falling, dreamy soft lighting, fairy tale scene",
    "Bride holding a bouquet of white roses in a grand palace ballroom, chandelier lighting",
    "Beach wedding at golden hour with waves in background, flower-lined aisle",
  ]},
  // Party & Celebration
  { category: "🎉 Party & Celebration", prompts: [
    "Rooftop party with city skyline at night, neon lights, vibrant energy, confetti falling",
    "Glamorous masquerade ball with ornate masks, dramatic chandelier lighting, elegant venue",
    "New Year's Eve party with fireworks in the background, champagne toast, glittering decorations",
    "Colorful Holi festival scene with vibrant powder colors, joyful celebration",
  ]},
  // Travel
  { category: "✈️ Travel", prompts: [
    "Standing in front of the Eiffel Tower at sunrise, warm golden light, travel photography",
    "Ancient ruins in Greece with blue sky and white buildings in background",
    "Colorful streets of Tokyo with cherry blossoms falling, vibrant scene",
    "Edge of Grand Canyon at sunset, dramatic landscape, adventure photography",
  ]},
  // Professional
  { category: "💼 Professional", prompts: [
    "Professional headshot in a modern office, clean background, confident pose, studio lighting",
    "Keynote speech on stage with spotlights, large audience, professional event",
    "Sleek modern desk with a city skyline view through floor-to-ceiling windows",
  ]},
];

const CHARACTER_PROMPTS = [
  // Trending AI
  { category: "🔥 Trending AI", prompts: [
    "A serene portrait walking in a garden, wearing a light-colored off-the-shoulder top with puff sleeves, holding a white flower, surrounded by various flowers plants and roses, soft diffused lighting, high-resolution natural quality",
    "Sitting in a circular wooden nook on wall with hanging plants and neon lights, wearing a colorful pink rose full sleeve sweatshirt, light white trousers, white Apple Watch, chunky white sports shoes, full body view, casual relaxed pose, bright soft lighting, cozy modern cafe vibe",
    "Wearing a flowing floor-length fancy red dress with long sleeves and matching blue high heels, sitting gracefully on an ornate shell-shaped swing decorated with interwoven white string lights and elegant gold accents, luxurious and festive feel",
    "Close-up at a tilted 45-degree angle, waist-length very long voluminous hair flowing freely, a few thin soft strands drifting across the face, long curled eyelashes, lips in a gentle deep red shade, wearing a full traditional black net lehenga, dreamy cinematic lighting",
    "Ultra-realistic 8K full-body portrait, wearing a clean pressed white dress shirt with turned-up collar, dark navy blue trousers, polished brown dress shoes, casually leaning against a smooth light gray studio wall, hands in pockets, relaxed and confident body language",
    "Create with a couple pic, stylish young boy wearing an oversized black tshirt and light-colored cargo pants, standing outdoors leaning against a metal railing, background features soft dark greenery and red-orange foliage, 16K hyper-realistic portrait, natural soft light",
  ]},
  // Eid Mubarak - English
  { category: "🌙 Eid Mubarak (English)", prompts: [
    "Wearing elegant Eid attire, standing in front of a beautifully decorated mosque at sunset with golden lanterns, text 'Eid Mubarak' in elegant calligraphy",
    "Celebrating Eid with family at a festive dinner table, warm lighting, joyful atmosphere, text 'Eid Mubarak' overlay",
    "Holding a crescent moon lantern in a garden at twilight, festive Eid decorations, text 'Happy Eid' in gold",
    "Posing in traditional clothing with Eid gifts and sweets, royal blue and gold theme, text 'Eid Mubarak'",
    "Standing under hanging lanterns and fairy lights, Eid celebration, elegant festive scene, text 'Blessed Eid'",
  ]},
  // Eid Mubarak - Urdu
  { category: "🌙 عید مبارک (Urdu)", prompts: [
    "Wearing elegant Eid attire with golden crescent moon and lanterns background, text 'عید مبارک' in beautiful Nastaliq calligraphy",
    "Standing in front of mosque at sunset with festive decorations, text 'عید الفطر مبارک' in golden Urdu calligraphy",
    "Celebrating with family, festive Eid scene, text 'آپکو اور آپکی فیملی کو عید مبارک' in Nastaliq calligraphy",
    "Posing with hanging lanterns and bokeh lights, text 'عید مبارک ہو' in beautiful golden Urdu text",
    "Elegant Eid celebration scene with floral border, text 'چاند مبارک' in Nastaliq calligraphy, night sky with crescent moon",
  ]},
  // Cinematic
  { category: "🎬 Cinematic", prompts: [
    "Standing on a rooftop at golden hour, cinematic lighting, dramatic sky, film grain, 35mm lens",
    "Walking through fog in a dimly lit alley, neon signs reflecting on wet ground, moody cinematic scene",
    "Close-up portrait with dramatic side lighting, shallow depth of field, cinematic color grading",
    "Sitting in a vintage car at sunset, warm golden light streaming through the window, movie still",
  ]},
  // Wedding
  { category: "💒 Wedding", prompts: [
    "Wearing elegant wedding attire in a beautiful garden with soft bokeh lights, romantic sunset",
    "Standing under a floral wedding arch with rose petals falling, dreamy soft lighting",
    "Holding a bouquet of white roses in a grand palace ballroom, chandelier lighting, elegant",
    "Walking down a flower-lined aisle at a beach wedding, golden hour, waves in background",
    "Couple dancing their first dance under fairy lights in an outdoor reception, romantic evening",
    "Standing in front of a vintage church entrance with a long flowing veil, soft natural light",
    "Exchanging rings at an altar decorated with white lilies and candles, emotional close-up",
    "Posing on a grand staircase in a luxury hotel wearing bridal attire, elegant and classy",
    "Tossing the bouquet at a garden wedding reception, joyful guests in the background, golden hour",
    "Walking hand in hand through a lavender field in wedding attire, dreamy purple tones, sunset",
  ]},
  // Party & Celebration
  { category: "🎉 Party & Celebration", prompts: [
    "Dancing at a rooftop party with city skyline at night, neon lights, vibrant energy, confetti",
    "Posing at a glamorous masquerade ball wearing an ornate mask, dramatic chandelier lighting",
    "Celebrating at a pool party with tropical decorations, splashing water, sunny vibes",
    "Standing at a red carpet event in a designer outfit, paparazzi flashes, VIP atmosphere",
    "Blowing out candles on a birthday cake surrounded by balloons and sparklers, warm cozy lighting",
    "At a New Year's Eve party with fireworks in the background, champagne toast, glittering outfit",
    "Dancing at a colorful Holi festival covered in vibrant powder colors, joyful celebration",
    "Enjoying a beach bonfire party at night with friends, guitar, warm glow, starry sky",
  ]},
  // Travel
  { category: "✈️ Travel", prompts: [
    "Standing in front of the Eiffel Tower at sunrise, warm golden light, travel photography",
    "Exploring ancient ruins in Greece with blue sky and white buildings in background",
    "Walking through colorful streets of Tokyo with cherry blossoms falling, vibrant scene",
    "Standing at the edge of Grand Canyon at sunset, dramatic landscape, adventure photography",
  ]},
  // Professional
  { category: "💼 Professional", prompts: [
    "Professional headshot in a modern office, clean background, confident pose, studio lighting",
    "Giving a keynote speech on stage with spotlights, large audience, professional event",
    "Working at a sleek desk with a city skyline view through floor-to-ceiling windows",
  ]},
];

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
