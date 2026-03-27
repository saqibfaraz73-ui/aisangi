import { useRef, useEffect, useCallback, useState } from "react";
import { PosterTemplate, TemplateElement, PosterSize } from "./types";
import { getImageCropRect } from "./draw-image-utils";

interface PosterCanvasProps {
  template: PosterTemplate;
  size: PosterSize;
  elements: TemplateElement[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<TemplateElement>) => void;
  uploadedPhotos: Record<string, string>;
  bgImage?: string | null;
}

const PREVIEW_MAX = 500;
const RESIZE_HANDLE_MOUSE = 8;
const RESIZE_HANDLE_TOUCH = 30;

function getPreviewDimensions(w: number, h: number) {
  const ratio = w / h;
  if (w > h) return { pw: PREVIEW_MAX, ph: PREVIEW_MAX / ratio };
  return { pw: PREVIEW_MAX * ratio, ph: PREVIEW_MAX };
}

type DragMode = "move" | "resize-br" | "resize-r" | "resize-b" | null;

export default function PosterCanvas({
  template,
  size,
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  uploadedPhotos,
  bgImage,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const bgImageRef = useRef<HTMLImageElement | null>(null);
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    // Draw background image if available
    const bgImg = bgImageRef.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      const imgRatio = bgImg.width / bgImg.height;
      const boxRatio = pw / ph;
      let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
      if (imgRatio > boxRatio) { sw = bgImg.height * boxRatio; sx = (bgImg.width - sw) / 2; }
      else { sh = bgImg.width / boxRatio; sy = (bgImg.height - sh) / 2; }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, pw, ph);
    }

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
        const photo = photoUrl ? imageCacheRef.current[el.id] : undefined;
        if (photoUrl && photo) {
          ctx.save();
          ctx.globalAlpha = el.opacity ?? 1;

          if (el.borderRadius === 50) {
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.clip();
          } else if (el.borderRadius) {
            clipRoundRect(ctx, x, y, w, h, el.borderRadius);
          }

          const imgRatio = photo.width / photo.height;
          const boxRatio = w / h;
          let sx = 0, sy = 0, sw = photo.width, sh = photo.height;
          if (imgRatio > boxRatio) {
            sw = photo.height * boxRatio;
            sx = (photo.width - sw) / 2;
          } else {
            sh = photo.width / boxRatio;
            sy = (photo.height - sh) / 2;
          }

          ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h);
          ctx.restore();
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

      // Selection indicator with resize handles
      if (selectedElement === el.id && el.editable) {
        ctx.strokeStyle = "#00BFFF";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.setLineDash([]);
        // Draw resize handle at bottom-right corner
        const handleSize = 12;
        ctx.fillStyle = "#00BFFF";
        ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
      }
    });
  }, [template, size, elements, selectedElement, uploadedPhotos, fontsLoaded, bgImage]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Load background image
  useEffect(() => {
    if (!bgImage) {
      bgImageRef.current = null;
      draw();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { bgImageRef.current = img; draw(); };
    img.onerror = () => { bgImageRef.current = null; draw(); };
    img.src = bgImage;
  }, [bgImage, draw]);

  useEffect(() => {
    let cancelled = false;
    const activeIds = new Set(Object.keys(uploadedPhotos));

    Object.keys(imageCacheRef.current).forEach((id) => {
      if (!activeIds.has(id)) delete imageCacheRef.current[id];
    });

    Promise.all(
      Object.entries(uploadedPhotos).map(
        ([elId, url]) =>
          new Promise<void>((resolve) => {
            const cached = imageCacheRef.current[elId];
            if (cached?.src === url) {
              resolve();
              return;
            }

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              if (!cancelled) imageCacheRef.current[elId] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          })
      )
    ).then(() => {
      if (!cancelled) draw();
    });

    return () => {
      cancelled = true;
    };
  }, [uploadedPhotos, draw]);

  const dragRef = useRef<{
    mode: DragMode;
    elId: string;
    startMx: number;
    startMy: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    moved: boolean;
  } | null>(null);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { mx: 0, my: 0 };
    const rect = canvas.getBoundingClientRect();
    const { pw, ph } = getPreviewDimensions(size.width, size.height);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      mx: ((clientX - rect.left) / rect.width) * pw,
      my: ((clientY - rect.top) / rect.height) * ph,
    };
  };

  const findElementAt = (mx: number, my: number, isTouch = false) => {
    const { pw, ph } = getPreviewDimensions(size.width, size.height);
    const handle = isTouch ? RESIZE_HANDLE_TOUCH : RESIZE_HANDLE_MOUSE;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (!el.editable) continue;
      const ex = (el.x / 100) * pw;
      const ey = (el.y / 100) * ph;
      const ew = (el.width / 100) * pw;
      const eh = (el.height / 100) * ph;
      // For touch, expand hit area slightly outside the element for easier resize
      const touchPad = isTouch ? 10 : 0;
      if (mx >= ex - touchPad && mx <= ex + ew + touchPad && my >= ey - touchPad && my <= ey + eh + touchPad) {
        const nearR = mx >= ex + ew - handle;
        const nearB = my >= ey + eh - handle;
        let mode: DragMode = "move";
        if (nearR && nearB) mode = "resize-br";
        else if (nearR) mode = "resize-r";
        else if (nearB) mode = "resize-b";
        return { el, mode };
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = "touches" in e;
    const { mx, my } = getCanvasCoords(e);
    const hit = findElementAt(mx, my, isTouch);
    if (hit) {
      onSelectElement(hit.el.id);
      dragRef.current = {
        mode: hit.mode,
        elId: hit.el.id,
        startMx: mx,
        startMy: my,
        startX: hit.el.x,
        startY: hit.el.y,
        startW: hit.el.width,
        startH: hit.el.height,
        moved: false,
      };
      e.preventDefault();
    } else {
      onSelectElement(null);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const drag = dragRef.current;
    if (!drag || !onUpdateElement) return;
    e.preventDefault();
    drag.moved = true;
    const { mx, my } = getCanvasCoords(e);
    const { pw, ph } = getPreviewDimensions(size.width, size.height);
    const dx = ((mx - drag.startMx) / pw) * 100;
    const dy = ((my - drag.startMy) / ph) * 100;

    if (drag.mode === "move") {
      const maxX = Math.max(0, 100 - drag.startW);
      const maxY = Math.max(0, 100 - drag.startH);
      onUpdateElement(drag.elId, {
        x: Math.max(0, Math.min(maxX, drag.startX + dx)),
        y: Math.max(0, Math.min(maxY, drag.startY + dy)),
      });
    } else if (drag.mode === "resize-br") {
      onUpdateElement(drag.elId, {
        width: Math.max(5, Math.min(100 - drag.startX, drag.startW + dx)),
        height: Math.max(5, Math.min(100 - drag.startY, drag.startH + dy)),
      });
    } else if (drag.mode === "resize-r") {
      onUpdateElement(drag.elId, { width: Math.max(5, Math.min(100 - drag.startX, drag.startW + dx)) });
    } else if (drag.mode === "resize-b") {
      onUpdateElement(drag.elId, { height: Math.max(5, Math.min(100 - drag.startY, drag.startH + dy)) });
    }
  };

  const handlePointerUp = () => { dragRef.current = null; };

  const handleMouseMoveForCursor = (e: React.MouseEvent) => {
    if (dragRef.current) { handlePointerMove(e); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { mx, my } = getCanvasCoords(e);
    const hit = findElementAt(mx, my);
    if (hit) {
      if (hit.mode === "resize-br") canvas.style.cursor = "nwse-resize";
      else if (hit.mode === "resize-r") canvas.style.cursor = "ew-resize";
      else if (hit.mode === "resize-b") canvas.style.cursor = "ns-resize";
      else canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = "default";
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handleMouseMoveForCursor}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className="border border-border rounded-lg mx-auto block max-w-full touch-none"
      style={{ maxWidth: "100%", height: "auto" }}
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
