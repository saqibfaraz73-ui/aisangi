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

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Image Gen ✅)" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash Preview (Image Gen ✅)" },
  { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro Preview (Best, Image Gen ✅)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Text only, no image gen)" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Text only)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Text only)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Text only)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Cheaper)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Cheapest)" },
  { value: "dall-e-3", label: "DALL·E 3 (Image only)" },
];

const ApiSettingsSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.0-flash");
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
      setApiKey(data.api_key || "");
      setProvider(data.provider || "gemini");
      setModel(data.model || "gemini-2.0-flash");
      setEnabled(data.enabled || false);
    }
    setLoading(false);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    // Reset model to default for selected provider
    if (newProvider === "gemini") setModel("gemini-2.0-flash");
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
          <label className="text-sm font-semibold text-foreground">Model</label>
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
              ? "For images use DALL·E 3. For scripts use GPT-4o."
              : "Gemini 2.0 Flash supports both text and image generation."}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save API Settings
        </Button>
      </div>
    </motion.div>
  );
};

export default ApiSettingsSection;
