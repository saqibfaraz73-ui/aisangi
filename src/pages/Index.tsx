import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, ArrowRight, ArrowLeft, Video, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepIndicator from "@/components/StepIndicator";
import UploadZone from "@/components/UploadZone";
import VideoPreview from "@/components/VideoPreview";
import ScriptEditor from "@/components/ScriptEditor";

const Index = () => {
  const [step, setStep] = useState(1);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleSelfie = useCallback((file: File | null) => {
    setSelfieFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setSelfiePreview(url);
    } else {
      setSelfiePreview(null);
    }
  }, []);

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 5000);
  };

  const canProceedStep1 = !!selfieFile;
  const canProceedStep2 = script.trim().length > 0 && !!voiceFile;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Video className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-lg text-foreground">AvatarStudio</h1>
          </div>
          <span className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-muted">
            AI Video Creator
          </span>
        </div>
      </header>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Left: Upload */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-2xl text-foreground">Create Your AI Avatar</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Upload a clear selfie and we'll generate a realistic AI character from your likeness.
                  </p>
                </div>
                <UploadZone
                  icon={Camera}
                  label="Upload Your Selfie"
                  accept="image/*"
                  hint="PNG, JPG up to 10MB · Face clearly visible"
                  onFile={handleSelfie}
                  preview={selfiePreview}
                />
                <div className="rounded-xl bg-card border border-border p-4 space-y-2">
                  <h4 className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">Tips for best results</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Good lighting, facing the camera directly</li>
                    <li>• Neutral expression works best</li>
                    <li>• No sunglasses or heavy filters</li>
                  </ul>
                </div>
              </div>

              {/* Right: Preview */}
              <VideoPreview
                avatarPreview={selfiePreview}
                isGenerating={false}
                isGenerated={false}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Left: Script + Voice */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-2xl text-foreground">Add Script & Voice</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Write the script your avatar will speak, then upload your voiceover for lip-sync.
                  </p>
                </div>
                <ScriptEditor script={script} onScriptChange={setScript} />
                <UploadZone
                  icon={Mic}
                  label="Upload Voiceover"
                  accept="audio/*"
                  hint="MP3, WAV, M4A up to 50MB"
                  onFile={setVoiceFile}
                />
              </div>

              {/* Right: Preview */}
              <VideoPreview
                avatarPreview={selfiePreview}
                isGenerating={false}
                isGenerated={false}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Left: Summary */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-2xl text-foreground">Generate Your Video</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Review your inputs and generate the AI lip-sync video.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
                    {selfiePreview && (
                      <img src={selfiePreview} alt="Avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">Avatar Ready</p>
                      <p className="text-xs text-muted-foreground">{selfieFile?.name}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Script</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{script}</p>
                  </div>

                  <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Voiceover</p>
                      <p className="text-xs text-muted-foreground">{voiceFile?.name}</p>
                    </div>
                  </div>
                </div>

                {!isGenerating && !isGenerated && (
                  <Button
                    onClick={handleGenerate}
                    className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Video
                  </Button>
                )}

                {isGenerated && (
                  <Button className="w-full h-12 gradient-primary text-primary-foreground font-display font-semibold">
                    Download Video
                  </Button>
                )}
              </div>

              {/* Right: Preview */}
              <VideoPreview
                avatarPreview={selfiePreview}
                isGenerating={isGenerating}
                isGenerated={isGenerated}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8 max-w-7xl mx-auto">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-border text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
