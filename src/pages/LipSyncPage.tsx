import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Mic, Video, Loader2, Download, Play, AlertCircle, Type, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

const LipSyncPage = () => {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<"audio" | "text">("audio");
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const cancelledRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setVideoUrl(null);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
  };

  const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
    // Upload to a temporary public URL using base64 data URL
    // Since we need a public URL for the API, we convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const pollStatus = async (videoId: string, provider: string) => {
    setPolling(true);
    setStatusMsg("Processing video...");
    
    const maxAttempts = 120; // 10 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      if (cancelledRef.current) break;
      await new Promise((r) => setTimeout(r, 5000));
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-lipsync", {
          body: { action: "check_status", video_id: videoId },
        });

        if (error) throw new Error(error.message);

        if (provider === "heygen") {
          const status = data?.data?.status;
          setStatusMsg(`Status: ${status || "checking"}...`);
          
          if (status === "completed") {
            setVideoUrl(data.data.video_url);
            toast({ title: "Lip-sync video ready!" });
            break;
          } else if (status === "failed") {
            throw new Error(data.data?.error || "Video generation failed");
          }
        } else {
          // D-ID
          const status = data?.status;
          setStatusMsg(`Status: ${status || "checking"}...`);
          
          if (status === "done") {
            setVideoUrl(data.result_url);
            toast({ title: "Lip-sync video ready!" });
            break;
          } else if (status === "error") {
            throw new Error("Video generation failed");
          }
        }
      } catch (err: any) {
        toast({ title: "Polling error", description: err.message, variant: "destructive" });
        break;
      }
    }
    
    setPolling(false);
    setStatusMsg("");
  };

  const handleGenerate = async () => {
    if (!imageFile) {
      toast({ title: "Please upload a face image", variant: "destructive" });
      return;
    }
    if (inputMode === "audio" && !audioFile) {
      toast({ title: "Please upload an audio file", variant: "destructive" });
      return;
    }
    if (inputMode === "text" && !text.trim()) {
      toast({ title: "Please enter text for speech", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setVideoUrl(null);
    setStatusMsg("Uploading and starting generation...");

    try {
      // Convert image to base64 data URL for the API
      const imageDataUrl = await uploadToStorage(imageFile, "lipsync-img");
      
      let audioDataUrl: string | undefined;
      if (inputMode === "audio" && audioFile) {
        audioDataUrl = await uploadToStorage(audioFile, "lipsync-audio");
      }

      const { data, error } = await supabase.functions.invoke("generate-lipsync", {
        body: {
          action: "generate",
          image_url: imageDataUrl,
          ...(inputMode === "audio" ? { audio_url: audioDataUrl } : { text: text.trim() }),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const videoId = data.video_id;
      const provider = data.provider;

      if (!videoId) throw new Error("No video ID returned");

      toast({ title: "Video generation started! Polling for result..." });
      setGenerating(false);
      
      await pollStatus(videoId, provider);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
      setStatusMsg("");
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `lipsync-${Date.now()}.mp4`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-3">
            Lip-Sync Video
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Upload a face image and audio to create a realistic talking avatar video
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-display font-semibold text-foreground">Face Image</label>
              <div
                onClick={() => imageInputRef.current?.click()}
                className="relative rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-card cursor-pointer transition-colors overflow-hidden"
                style={{ minHeight: "200px" }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Face" className="w-full h-48 object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Upload className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-sm">Click to upload face image</span>
                    <span className="text-xs opacity-60 mt-1">PNG, JPG — clear face photo works best</span>
                  </div>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Audio/Text Input */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "audio" | "text")}>
              <TabsList className="w-full">
                <TabsTrigger value="audio" className="flex-1 gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Audio File
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1 gap-1.5">
                  <Type className="h-3.5 w-3.5" /> Text to Speech
                </TabsTrigger>
              </TabsList>

              <TabsContent value="audio" className="space-y-2 mt-3">
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-card cursor-pointer transition-colors p-6 text-center"
                >
                  {audioFile ? (
                    <div className="space-y-2">
                      <Mic className="h-6 w-6 mx-auto text-primary" />
                      <p className="text-sm text-foreground font-medium">{audioFile.name}</p>
                      {audioUrl && <audio src={audioUrl} controls className="mx-auto mt-2" />}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Mic className="h-8 w-8 mb-2 mx-auto opacity-50" />
                      <span className="text-sm">Click to upload audio</span>
                      <p className="text-xs opacity-60 mt-1">MP3, WAV — voice recording</p>
                    </div>
                  )}
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioSelect}
                />
              </TabsContent>

              <TabsContent value="text" className="mt-3">
                <Textarea
                  placeholder="Enter the text you want the character to speak..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Text will be converted to speech using the provider's TTS engine
                </p>
              </TabsContent>
            </Tabs>

            {/* Info Box */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground flex gap-2">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">How it works:</strong> Your image and audio are sent to the configured provider (HeyGen or D-ID) which generates a realistic talking video. Processing takes 1-5 minutes.
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || polling || !imageFile}
              className="w-full h-12 gradient-accent text-accent-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : polling ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {statusMsg || "Processing..."}
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  Generate Lip-Sync Video
                </>
              )}
            </Button>
          </motion.div>

          {/* Right: Preview */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-foreground text-sm">Result</h3>
              </div>
              <div
                className="bg-muted flex items-center justify-center"
                style={{ aspectRatio: "9/16", maxHeight: "500px" }}
              >
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : polling ? (
                  <div className="text-center p-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{statusMsg || "Waiting for video..."}</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Upload an image and audio to generate</p>
                  </div>
                )}
              </div>
              {videoUrl && (
                <div className="p-4 border-t border-border">
                  <Button onClick={downloadVideo} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LipSyncPage;
