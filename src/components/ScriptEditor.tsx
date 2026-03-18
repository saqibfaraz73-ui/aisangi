import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface ScriptEditorProps {
  script: string;
  onScriptChange: (s: string) => void;
}

const ScriptEditor = ({ script, onScriptChange }: ScriptEditorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Video Script</h3>
      </div>
      <Textarea
        value={script}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder="Write or paste your video script here... The AI character will speak these words with lip-sync animation."
        className="min-h-[140px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-primary font-body text-sm"
      />
      <p className="text-xs text-muted-foreground">{script.length} characters</p>
    </div>
  );
};

export default ScriptEditor;
