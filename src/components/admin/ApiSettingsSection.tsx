import { useEffect, useState } from "react";
import { Key, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Fast & Free tier)" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Fastest)" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash Preview" },
  { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro Preview (Best quality)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

const IMAGE_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Image Gen)" },
  { value: "imagen-3.0-generate-002", label: "Imagen 3.0 (High Quality)" },
];

const ApiSettingsSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setApiKey(data.api_key || "");
      setModel(data.model || "gemini-2.0-flash");
      setEnabled(data.enabled || false);
    }
    setLoading(false);
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

      if (existing) {
        const { error } = await supabase
          .from("api_settings")
          .update({
            api_key: apiKey.trim(),
            model,
            enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("api_settings")
          .insert({
            api_key: apiKey.trim(),
            provider: "gemini",
            model,
            enabled,
          });
        if (error) throw error;
      }

      toast({ title: "API settings saved!" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
        <h2 className="font-display font-bold text-lg text-foreground">Custom Gemini API</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Use your own Google Gemini API key instead of Lovable AI credits. Get a free key from{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Google AI Studio
        </a>.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Enable Custom API</label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Gemini API Key</label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
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
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Model</label>
          <Select value={model} onValueChange={setModel} disabled={!enabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Text & Image Generation</div>
              {GEMINI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This model will be used for both image generation and script generation.
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
