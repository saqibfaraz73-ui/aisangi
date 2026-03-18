import { useCallback } from "react";
import { type AnimationStyle, type PlatformPreset, PLATFORM_PRESETS } from "./types";

function getEased(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  t: number,
  style: AnimationStyle
) {
  const eased = getEased(t);
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const aspect = W / H;
  const imgAspect = img.width / img.height;
  let drawW = img.width, drawH = img.height;

  if (imgAspect > aspect) {
    drawH = img.height;
    drawW = drawH * aspect;
  } else {
    drawW = img.width;
    drawH = drawW / aspect;
  }

  const maxOffsetX = img.width - drawW;
  const maxOffsetY = img.height - drawH;
  let sx = 0, sy = 0, sw = drawW, sh = drawH;

  switch (style) {
    case "zoom-in": {
      const scale = 1 + eased * 0.35;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (img.width - cw) / 2; sy = (img.height - ch) / 2;
      sw = cw; sh = ch;
      break;
    }
    case "zoom-out": {
      const scale = 1.35 - eased * 0.35;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (img.width - cw) / 2; sy = (img.height - ch) / 2;
      sw = cw; sh = ch;
      break;
    }
    case "pan-left": {
      sx = maxOffsetX * (1 - eased); sy = (img.height - drawH) / 2;
      break;
    }
    case "pan-right": {
      sx = maxOffsetX * eased; sy = (img.height - drawH) / 2;
      break;
    }
    case "pan-up": {
      sx = (img.width - drawW) / 2; sy = maxOffsetY * (1 - eased);
      break;
    }
    case "ken-burns": {
      const scale = 1 + eased * 0.3;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (img.width - cw) * eased * 0.4;
      sy = (img.height - ch) * (1 - eased) * 0.4;
      sw = cw; sh = ch;
      break;
    }
    case "drift": {
      const scale = 1 + eased * 0.15;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (img.width - cw) * eased * 0.6;
      sy = (img.height - ch) * eased * 0.4;
      sw = cw; sh = ch;
      break;
    }
    case "dramatic-zoom": {
      const dramatic = 1 - Math.pow(1 - t, 3);
      const scale = 1 + dramatic * 0.5;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (img.width - cw) / 2; sy = (img.height - ch) / 2;
      sw = cw; sh = ch;
      break;
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function useVideoGenerator(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const generate = useCallback(
    async (
      images: string[],
      style: AnimationStyle,
      durations: number[],
      platform: PlatformPreset
    ): Promise<string> => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not ready");

      const ctx = canvas.getContext("2d")!;
      const { width: W, height: H } = PLATFORM_PRESETS[platform];
      canvas.width = W;
      canvas.height = H;

      const fps = 30;
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      // Render each image with its own duration
      for (let i = 0; i < images.length; i++) {
        const img = await loadImage(images[i]);
        const imgDuration = durations[i] || 5;
        const totalFrames = imgDuration * fps;

        for (let frame = 0; frame < totalFrames; frame++) {
          const t = frame / totalFrames;
          renderFrame(ctx, img, W, H, t, style);
          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
      }

      recorder.stop();
      await done;

      const blob = new Blob(chunks, { type: "video/webm" });
      return URL.createObjectURL(blob);
    },
    [canvasRef]
  );

  return { generate };
}
