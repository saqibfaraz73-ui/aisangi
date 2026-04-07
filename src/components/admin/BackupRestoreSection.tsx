import { useState, useRef } from "react";
import { Download, Upload, Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BACKUP_VERSION = 3;

const TABLES_TO_BACKUP = [
  "profiles",
  "user_roles",
  "premium_users",
  "usage_limits",
  "user_usage_limits",
  "premium_usage_limits",
  "usage_log",
  "api_settings",
  "app_settings",
  "elevenlabs_settings",
  "global_usage_cap",
  "daily_token_cap",
  "image_generation_cap",
  "script_generation_cap",
  "voice_generation_cap",
  "music_generation_cap",
  "lipsync_settings",
  "rate_limit_settings",
  "section_visibility",
  "watermark_settings",
  "page_visits",
] as const;

type TableName = (typeof TABLES_TO_BACKUP)[number];

const BackupRestoreSection = () => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    setExporting(true);
    try {
      const backup: Record<string, unknown> = {
        version: BACKUP_VERSION,
        exported_at: new Date().toISOString(),
      };

      for (const table of TABLES_TO_BACKUP) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.warn(`Failed to export ${table}:`, error.message);
          backup[table] = [];
        } else {
          backup[table] = data ?? [];
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `app-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Backup exported successfully!" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setRestoreResult(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.exported_at) {
        throw new Error("Invalid backup file format");
      }

      let restored = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Restore order matters for foreign key dependencies
      const restoreOrder: TableName[] = [
        "profiles",
        "user_roles",
        "premium_users",
        "api_settings",
        "app_settings",
        "elevenlabs_settings",
        "global_usage_cap",
        "daily_token_cap",
        "image_generation_cap",
        "script_generation_cap",
        "voice_generation_cap",
        "music_generation_cap",
        "lipsync_settings",
        "rate_limit_settings",
        "section_visibility",
        "watermark_settings",
        "usage_limits",
        "user_usage_limits",
        "premium_usage_limits",
        "usage_log",
        "page_visits",
      ];

      for (const table of restoreOrder) {
        const rows = backup[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          skipped++;
          continue;
        }

        // Upsert each row individually to handle conflicts
        for (const row of rows) {
          const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
          if (error) {
            errors.push(`${table}: ${error.message}`);
          }
        }
        restored++;
      }

      const msg = `Restored ${restored} tables. ${skipped} skipped (empty/missing).${errors.length > 0 ? ` ${errors.length} errors.` : ""}`;
      setRestoreResult({
        success: errors.length === 0,
        message: msg,
      });

      if (errors.length > 0) {
        console.warn("Restore errors:", errors);
        toast({ title: "Restore completed with errors", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Backup restored successfully!", description: msg });
      }
    } catch (err: any) {
      setRestoreResult({ success: false, message: err.message });
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Backup & Restore</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Export all app data (settings, users, limits, usage logs) as a JSON file, or restore from a previous backup.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <Button onClick={exportBackup} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Exporting..." : "Export Backup"}
        </Button>

        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="gap-2"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? "Restoring..." : "Restore from Backup"}
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

      <p className="text-muted-foreground text-xs mt-3">
        Tables included: {TABLES_TO_BACKUP.join(", ")}
      </p>
    </div>
  );
};

export default BackupRestoreSection;
