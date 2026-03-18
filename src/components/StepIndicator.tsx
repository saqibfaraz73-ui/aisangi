import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface Step {
  number: number;
  label: string;
}

const steps: Step[] = [
  { number: 1, label: "Create Avatar" },
  { number: 2, label: "Script & Voice" },
  { number: 3, label: "Generate Video" },
];

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 py-6 px-4">
      {steps.map((step, i) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;

        return (
          <div key={step.number} className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold font-display transition-colors ${
                  isCompleted
                    ? "gradient-accent text-accent-foreground"
                    : isActive
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </motion.div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-12 md:w-20 transition-colors ${
                  isCompleted ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
