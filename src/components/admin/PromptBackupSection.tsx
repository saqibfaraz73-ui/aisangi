import { useState, useRef } from "react";
import { Download, Upload, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GENERAL_PROMPTS, CHARACTER_PROMPTS, PromptCategory } from "@/data/prompts";

const PromptBackupSection = () => {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportPrompts = () => {
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      type: "prompts_only",
      general_prompts: GENERAL_PROMPTS,
      character_prompts: CHARACTER_PROMPTS,
    };

    const totalPrompts = [...GENERAL_PROMPTS, ...CHARACTER_PROMPTS].reduce(
      (sum, cat) => sum + cat.prompts.length, 0
    );

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `prompts-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: `Exported ${totalPrompts} prompts successfully!` });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setRestoreResult(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.general_prompts && !backup.character_prompts) {
        throw new Error("Invalid prompt backup file — missing prompt data");
      }

      const generalCount = (backup.general_prompts as PromptCategory[] || []).reduce(
        (sum: number, cat: PromptCategory) => sum + cat.prompts.length, 0
      );
      const characterCount = (backup.character_prompts as PromptCategory[] || []).reduce(
        (sum: number, cat: PromptCategory) => sum + cat.prompts.length, 0
      );

      const msg = `Backup contains ${generalCount} general prompts and ${characterCount} character prompts across ${
        (backup.general_prompts?.length || 0) + (backup.character_prompts?.length || 0)
      } categories. To restore, update the prompts data file with this backup.`;
      
      setRestoreResult({ success: true, message: msg });
      toast({ title: "Prompt backup validated!", description: msg });
    } catch (err: any) {
      setRestoreResult({ success: false, message: err.message });
      toast({ title: "Invalid backup file", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const totalGeneral = GENERAL_PROMPTS.reduce((sum, cat) => sum + cat.prompts.length, 0);
  const totalCharacter = CHARACTER_PROMPTS.reduce((sum, cat) => sum + cat.prompts.length, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Prompt Backup</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-2">
        Export all image generation prompts (general + character) as a JSON file.
      </p>
      <p className="text-muted-foreground text-xs mb-4">
        Current: <span className="text-foreground font-medium">{totalGeneral}</span> general prompts ({GENERAL_PROMPTS.length} categories) · <span className="text-foreground font-medium">{totalCharacter}</span> character prompts ({CHARACTER_PROMPTS.length} categories)
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <Button onClick={exportPrompts} className="gap-2">
          <Download className="h-4 w-4" />
          Export Prompts
        </Button>

        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="gap-2"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? "Validating..." : "Validate Backup File"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {restoreResult && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${restoreResult.success ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
          {restoreResult.success ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{restoreResult.message}</span>
        </div>
      )}
    </div>
  );
};

export default PromptBackupSection;
