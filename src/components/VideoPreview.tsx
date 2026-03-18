import { motion } from "framer-motion";
import { Play, User, Sparkles } from "lucide-react";

interface VideoPreviewProps {
  avatarPreview: string | null;
  isGenerating: boolean;
  isGenerated: boolean;
}

const VideoPreview = ({ avatarPreview, isGenerating, isGenerated }: VideoPreviewProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] lg:min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md aspect-[9/16] rounded-2xl bg-card border border-border overflow-hidden shadow-card"
      >
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent"
            />
            <div className="text-center px-4">
              <p className="text-sm font-display font-semibold text-foreground">Generating your video...</p>
              <p className="text-xs text-muted-foreground mt-1">AI is creating lip-sync animation</p>
            </div>
            <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "85%" }}
                transition={{ duration: 8, ease: "easeInOut" }}
              />
            </div>
          </div>
        ) : isGenerated ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full gradient-accent flex items-center justify-center">
              <Play className="h-7 w-7 text-accent-foreground ml-1" />
            </div>
            <p className="text-sm font-display font-semibold text-foreground">Video Ready!</p>
            <p className="text-xs text-muted-foreground">Click to preview</p>
          </div>
        ) : avatarPreview ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/30"
            />
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Avatar Created</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <User className="h-10 w-10" />
            </div>
            <p className="text-sm font-medium">Upload a selfie to begin</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VideoPreview;
