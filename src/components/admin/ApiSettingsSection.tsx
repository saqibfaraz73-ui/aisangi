import { useEffect, useState } from "react";
import { Key, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI (ChatGPT)" },
];

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-image";

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Best free-tier for images)" },
  { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image Preview (Higher-quality images)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Best for scripts)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Cheaper text)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Text only)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Text only)" },
];

const GEMINI_MODEL_VALUES = new Set(GEMINI_MODELS.map(({ value }) => value));

const normalizeGeminiModel = (value?: string | null) =>
  value && GEMINI_MODEL_VALUES.has(value) ? value : DEFAULT_GEMINI_MODEL;

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Cheaper)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Cheapest)" },
  { value: "dall-e-3", label: "DALL·E 3 (Image only)" },
];

const GEMINI_SCRIPT_MODELS = [
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Cheapest, good for scripts)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Better quality)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Legacy)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Legacy)" },
];

const GEMINI_VOICE_MODELS = [
  { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS (Default)" },
  { value: "gemini-2.0-flash-preview-tts", label: "Gemini 2.0 Flash TTS (Older)" },
];

const ApiSettingsSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [scriptModel, setScriptModel] = useState("gemini-2.5-flash-lite");
  const [voiceModel, setVoiceModel] = useState("gemini-2.5-flash-preview-tts");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      const nextProvider = data.provider || "gemini";
      setApiKey(data.api_key || "");
      setProvider(nextProvider);
      setModel(nextProvider === "gemini" ? normalizeGeminiModel(data.model) : data.model || "gpt-4o");
      setScriptModel((data as any).script_model || "gemini-2.5-flash-lite");
      setEnabled(Boolean(data.enabled));
    }
    setLoading(false);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    if (newProvider === "gemini") setModel(DEFAULT_GEMINI_MODEL);
    else setModel("gpt-4o");
  };

  const handleSave = async () => {
    if (enabled && !apiKey.trim()) {
      toast({ title: "API key is required when enabled", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("api_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        api_key: apiKey.trim(),
        provider,
        model,
        script_model: scriptModel,
        enabled,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase.from("api_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("api_settings").insert(payload);
        if (error) throw error;
      }

      toast({ title: "API settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentModels = provider === "openai" ? OPENAI_MODELS : GEMINI_MODELS;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Custom AI API</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Use your own API key for image & script generation. No Lovable credits needed.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Enable Custom API</label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Provider</label>
          <Select value={provider} onValueChange={handleProviderChange} disabled={!enabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">API Key</label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-..." : "AIzaSy..."}
              className="pr-10"
              disabled={!enabled}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {provider === "openai" ? (
              <>Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Dashboard</a></>
            ) : (
              <>Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a></>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Image Model</label>
          <Select value={model} onValueChange={setModel} disabled={!enabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {provider === "openai"
              ? "For images use DALL·E 3."
              : "Used for image generation."}
          </p>
        </div>

        {provider === "gemini" && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Script Model</label>
            <Select value={scriptModel} onValueChange={setScriptModel} disabled={!enabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_SCRIPT_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for script generation. Flash Lite is cheapest.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save API Settings
        </Button>
      </div>
    </motion.div>
  );
};

export default ApiSettingsSection;
