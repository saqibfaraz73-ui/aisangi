import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen } from "lucide-react";
import { saveFileToDevice } from "@/hooks/use-native-file";

interface NativeSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Blob | string | null;
  defaultName?: string;
  defaultFolder?: string;
}

const NativeSaveDialog = ({
  open,
  onOpenChange,
  data,
  defaultName = "file",
  defaultFolder = "",
}: NativeSaveDialogProps) => {
  const [fileName, setFileName] = useState(defaultName);
  const [folder, setFolder] = useState(defaultFolder);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    await saveFileToDevice(data, fileName, folder || undefined);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-4 w-4 text-primary" /> Save File
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" /> Folder (optional)
            </Label>
            <Input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. AiSangi/Images"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Saved inside Documents folder. Leave empty for root.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!fileName.trim() || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NativeSaveDialog;
