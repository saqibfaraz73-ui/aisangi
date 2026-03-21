import { useRef, useEffect, useCallback, useState } from "react";
import { PosterTemplate, TemplateElement, PosterSize } from "./types";

interface PosterCanvasProps {
  template: PosterTemplate;
  size: PosterSize;
  elements: TemplateElement[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  uploadedPhotos: Record<string, string>;
}

const PREVIEW_MAX = 500;

function getPreviewDimensions(w: number, h: number) {
  const ratio = w / h;
  if (w > h) return { pw: PREVIEW_MAX, ph: PREVIEW_MAX / ratio };
  return { pw: PREVIEW_MAX * ratio, ph: PREVIEW_MAX };
}

export default function PosterCanvas({
  template,
  size,
  elements,
  selectedElement,
  onSelectElement,
  uploadedPhotos,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pw, ph } = getPreviewDimensions(size.width, size.height);
    canvas.width = pw * 2;
    canvas.height = ph * 2;
    canvas.style.width = `${pw}px`;
    canvas.style.height = `${ph}px`;
    ctx.scale(2, 2);

    // Background
    if (template.bgGradient) {
      const grad = ctx.createLinearGradient(0, 0, pw, ph);
      // Parse simple gradient
      grad.addColorStop(0, template.bgColor);
      grad.addColorStop(1, template.bgColor);
      // Try to use bgGradient colors
      const colorMatches = template.bgGradient.match(/#[0-9a-fA-F]{6}/g);
      if (colorMatches && colorMatches.length >= 2) {
        const g = ctx.createLinearGradient(0, 0, pw, ph);
        colorMatches.forEach((c, i) => g.addColorStop(i / (colorMatches.length - 1), c));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = template.bgColor;
      }
    } else {
      ctx.fillStyle = template.bgColor;
    }
    ctx.fillRect(0, 0, pw, ph);

    // Draw elements
    elements.forEach((el) => {
      const x = (el.x / 100) * pw;
      const y = (el.y / 100) * ph;
      const w = (el.width / 100) * pw;
      const h = (el.height / 100) * ph;

      if (el.type === "rect") {
        ctx.fillStyle = el.bgColor || "#333";
        ctx.globalAlpha = el.opacity ?? 1;
        if (el.borderRadius) {
          roundRect(ctx, x, y, w, h, el.borderRadius);
        } else {
          ctx.fillRect(x, y, w, h);
        }
        ctx.globalAlpha = 1;
      } else if (el.type === "circle") {
        ctx.fillStyle = el.bgColor || "#333";
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (el.type === "image") {
        const photoUrl = uploadedPhotos[el.id];
        if (photoUrl) {
          // Photo will be drawn by image load effect
        } else {
          // Placeholder
          ctx.fillStyle = el.bgColor || "rgba(255,255,255,0.1)";
          ctx.globalAlpha = el.opacity ?? 0.3;
          if (el.borderRadius === 50) {
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            roundRect(ctx, x, y, w, h, el.borderRadius || 0);
          }
          ctx.globalAlpha = 1;
          // "+" icon
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = `${Math.min(w, h) * 0.4}px Inter`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", x + w / 2, y + h / 2);
        }
      } else if (el.type === "text" && el.text) {
        const fontSize = ((el.fontSize || 3) / 100) * ph;
        const family = el.fontFamily || "Inter";
        const weight = el.fontWeight || "normal";
        ctx.font = `${weight} ${fontSize}px "${family}", sans-serif`;
        ctx.fillStyle = el.color || "#FFFFFF";
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.textBaseline = "top";

        if (el.direction === "rtl") ctx.direction = "rtl";
        else ctx.direction = "ltr";

        const align = el.textAlign || "center";
        let tx = x;
        if (align === "center") { ctx.textAlign = "center"; tx = x + w / 2; }
        else if (align === "right") { ctx.textAlign = "right"; tx = x + w; }
        else { ctx.textAlign = "left"; }

        const lines = el.text.split("\n");
        const lh = fontSize * (el.lineHeight || 1.4);
        lines.forEach((line, i) => {
          ctx.fillText(line, tx, y + i * lh);
        });

        ctx.direction = "ltr";
        ctx.globalAlpha = 1;
      }

      // Selection indicator
      if (selectedElement === el.id && el.editable) {
        ctx.strokeStyle = "#00BFFF";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.setLineDash([]);
      }
    });
  }, [template, size, elements, selectedElement, uploadedPhotos, fontsLoaded]);

  // Draw photos
  useEffect(() => {
    draw();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { pw, ph } = getPreviewDimensions(size.width, size.height);

    Object.entries(uploadedPhotos).forEach(([elId, url]) => {
      const el = elements.find((e) => e.id === elId);
      if (!el) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        draw(); // Redraw base
        const c2 = canvasRef.current?.getContext("2d");
        if (!c2) return;
        c2.save();
        c2.scale(2, 2);
        const x = (el.x / 100) * pw;
        const y = (el.y / 100) * ph;
        const w = (el.width / 100) * pw;
        const h = (el.height / 100) * ph;

        if (el.borderRadius === 50) {
          c2.beginPath();
          c2.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          c2.clip();
        } else if (el.borderRadius) {
          clipRoundRect(c2, x, y, w, h, el.borderRadius);
        }

        // Cover fit
        const imgRatio = img.width / img.height;
        const boxRatio = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > boxRatio) {
          sw = img.height * boxRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / boxRatio;
          sy = (img.height - sh) / 2;
        }
        c2.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        c2.restore();
      };
      img.src = url;
    });
  }, [draw, uploadedPhotos, elements, size]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { pw, ph } = getPreviewDimensions(size.width, size.height);
    const mx = ((e.clientX - rect.left) / rect.width) * pw;
    const my = ((e.clientY - rect.top) / rect.height) * ph;

    // Find topmost editable element at click position
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (!el.editable) continue;
      const ex = (el.x / 100) * pw;
      const ey = (el.y / 100) * ph;
      const ew = (el.width / 100) * pw;
      const eh = (el.height / 100) * ph;
      if (mx >= ex && mx <= ex + ew && my >= ey && my <= ey + eh) {
        onSelectElement(el.id);
        return;
      }
    }
    onSelectElement(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="border border-border rounded-lg cursor-pointer mx-auto block"
      style={{ maxWidth: "100%" }}
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();
}
