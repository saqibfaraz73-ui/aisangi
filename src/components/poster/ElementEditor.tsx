import { TemplateElement } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Type, Palette, Move } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ElementEditorProps {
  element: TemplateElement;
  onUpdate: (id: string, updates: Partial<TemplateElement>) => void;
  onUploadPhoto: (elementId: string) => void;
}

const URDU_FONTS = [
  { value: "Noto Nastaliq Urdu", label: "نستعلیق (Nastaliq)" },
  { value: "Noto Naskh Arabic", label: "نسخ (Naskh)" },
  { value: "Inter", label: "English (Inter)" },
];

export default function ElementEditor({ element, onUpdate, onUploadPhoto }: ElementEditorProps) {
  const maxX = Math.max(0, 100 - element.width);
  const maxY = Math.max(0, 100 - element.height);
  const maxWidth = Math.max(5, 100 - element.x);
  const maxHeight = Math.max(5, 100 - element.y);

  if (element.type === "image" && element.isPhoto) {
    return (
      <div className="space-y-3 p-3 bg-card rounded-lg border border-border">
        <Label className="text-sm font-medium text-foreground">📷 Photo Slot</Label>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onUploadPhoto(element.id)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>

        {/* Position Controls */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Move className="h-3 w-3" /> Position & Size
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">X (%)</Label>
              <Slider min={0} max={maxX} step={1} value={[Math.min(element.x, maxX)]} onValueChange={([v]) => onUpdate(element.id, { x: v })} />
              <span className="text-[10px] text-muted-foreground">{element.x}%</span>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Y (%)</Label>
              <Slider min={0} max={maxY} step={1} value={[Math.min(element.y, maxY)]} onValueChange={([v]) => onUpdate(element.id, { y: v })} />
              <span className="text-[10px] text-muted-foreground">{element.y}%</span>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Width (%)</Label>
              <Slider min={5} max={maxWidth} step={1} value={[Math.min(element.width, maxWidth)]} onValueChange={([v]) => onUpdate(element.id, { width: v })} />
              <span className="text-[10px] text-muted-foreground">{element.width}%</span>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Height (%)</Label>
              <Slider min={5} max={maxHeight} step={1} value={[Math.min(element.height, maxHeight)]} onValueChange={([v]) => onUpdate(element.id, { height: v })} />
              <span className="text-[10px] text-muted-foreground">{element.height}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (element.type !== "text") return null;

  return (
    <div className="space-y-3 p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Type className="h-4 w-4" />
        <span>{element.direction === "rtl" ? "متن ایڈٹ کریں" : "Edit Text"}</span>
      </div>

      <Textarea
        value={element.text || ""}
        onChange={(e) => onUpdate(element.id, { text: e.target.value })}
        dir={element.direction || "ltr"}
        className="min-h-[60px] text-sm"
        placeholder={element.direction === "rtl" ? "یہاں لکھیں..." : "Type here..."}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select
            value={element.fontFamily || "Noto Nastaliq Urdu"}
            onValueChange={(v) => onUpdate(element.id, { fontFamily: v, direction: v.includes("Noto") ? "rtl" : "ltr" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URDU_FONTS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Size</Label>
          <Input
            type="number"
            min={1}
            max={15}
            step={0.5}
            value={element.fontSize || 3}
            onChange={(e) => onUpdate(element.id, { fontSize: parseFloat(e.target.value) || 3 })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Palette className="h-3 w-3" /> Color
          </Label>
          <div className="flex gap-1">
            <input
              type="color"
              value={element.color || "#FFFFFF"}
              onChange={(e) => onUpdate(element.id, { color: e.target.value })}
              className="h-8 w-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={element.color || "#FFFFFF"}
              onChange={(e) => onUpdate(element.id, { color: e.target.value })}
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Align</Label>
          <Select
            value={element.textAlign || "center"}
            onValueChange={(v) => onUpdate(element.id, { textAlign: v as "left" | "center" | "right" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right / دایاں</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Font Weight</Label>
        <Select
          value={element.fontWeight || "normal"}
          onValueChange={(v) => onUpdate(element.id, { fontWeight: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Position Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Move className="h-3 w-3" /> Position & Size
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">X (%)</Label>
            <Slider min={0} max={maxX} step={1} value={[Math.min(element.x, maxX)]} onValueChange={([v]) => onUpdate(element.id, { x: v })} />
            <span className="text-[10px] text-muted-foreground">{element.x}%</span>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Y (%)</Label>
            <Slider min={0} max={maxY} step={1} value={[Math.min(element.y, maxY)]} onValueChange={([v]) => onUpdate(element.id, { y: v })} />
            <span className="text-[10px] text-muted-foreground">{element.y}%</span>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Width (%)</Label>
            <Slider min={5} max={maxWidth} step={1} value={[Math.min(element.width, maxWidth)]} onValueChange={([v]) => onUpdate(element.id, { width: v })} />
            <span className="text-[10px] text-muted-foreground">{element.width}%</span>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Height (%)</Label>
            <Slider min={5} max={maxHeight} step={1} value={[Math.min(element.height, maxHeight)]} onValueChange={([v]) => onUpdate(element.id, { height: v })} />
            <span className="text-[10px] text-muted-foreground">{element.height}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
