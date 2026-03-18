import { motion } from "framer-motion";

interface SceneCountSelectorProps {
  count: number;
  onChange: (count: number) => void;
}

const options = [1, 2, 3, 4];

const SceneCountSelector = ({ count, onChange }: SceneCountSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-display font-semibold text-foreground">
        Number of Scenes
      </label>
      <div className="flex gap-2">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`relative flex-1 h-10 rounded-lg text-sm font-display font-semibold transition-colors ${
              count === n
                ? "text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {count === n && (
              <motion.div
                layoutId="scene-count-bg"
                className="absolute inset-0 rounded-lg gradient-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{n}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {count === 1 ? "Single image" : `${count} unique variations of your prompt`}
      </p>
    </div>
  );
};

export default SceneCountSelector;
