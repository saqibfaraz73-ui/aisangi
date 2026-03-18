import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface SceneCountSelectorProps {
  count: number | null;
  onChange: (count: number | null) => void;
}

const SceneCountSelector = ({ count, onChange }: SceneCountSelectorProps) => {
  const isAuto = count === null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-display font-semibold text-foreground">
        Number of Scenes
      </label>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => onChange(null)}
          className={`relative px-4 h-9 rounded-lg text-sm font-display font-semibold transition-colors ${
            isAuto
              ? "text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {isAuto && (
            <motion.div
              layoutId="scene-count-bg"
              className="absolute inset-0 rounded-lg gradient-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">Auto</span>
        </button>
        <button
          onClick={() => onChange(count ?? 4)}
          className={`relative px-4 h-9 rounded-lg text-sm font-display font-semibold transition-colors ${
            !isAuto
              ? "text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {!isAuto && (
            <motion.div
              layoutId="scene-count-bg"
              className="absolute inset-0 rounded-lg gradient-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">Custom</span>
        </button>
      </div>

      {!isAuto && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <Slider
              value={[count!]}
              onValueChange={([v]) => onChange(v)}
              min={1}
              max={20}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-display font-bold text-foreground w-8 text-center">
              {count}
            </span>
          </div>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground">
        {isAuto
          ? "AI will decide the best number of scenes for your idea"
          : count === 1
            ? "Single scene"
            : `${count} scenes will be generated`}
      </p>
    </div>
  );
};

export default SceneCountSelector;
