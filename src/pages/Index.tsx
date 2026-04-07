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
