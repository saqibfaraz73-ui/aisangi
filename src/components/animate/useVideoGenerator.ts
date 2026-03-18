import { useCallback } from "react";
import { type AnimationStyle, type PlatformPreset, type MediaItem, PLATFORM_PRESETS } from "./types";
import type { AudioTrackInput } from "./AudioInputSection";

function getEased(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const COLOR_MAP: Record<string, string> = {
  white: "rgba(255, 255, 255, 0.4)",
  black: "rgba(0, 0, 0, 0.4)",
  blue: "rgba(59, 130, 246, 0.5)",
  green: "rgba(34, 197, 94, 0.5)",
  yellow: "rgba(234, 179, 8, 0.5)",
};

function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, color: string = "white") {
  ctx.save();
  const fontSize = Math.max(16, Math.min(W, H) * 0.04);
  ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = COLOR_MAP[color] || COLOR_MAP.white;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const x = fontSize * 0.5;
  const y = fontSize * 0.4;
  ctx.translate(x, y);
  ctx.rotate(0.05);
  ctx.fillText("SANGIAi", 0, 0);
  ctx.restore();
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  W: number,
  H: number,
  t: number,
  style: AnimationStyle
) {
  const eased = getEased(t);
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const imgW = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgH = img instanceof HTMLVideoElement ? img.videoHeight : img.height;

  const aspect = W / H;
  const imgAspect = imgW / imgH;
  let drawW = imgW, drawH = imgH;

  if (imgAspect > aspect) {
    drawH = imgH;
    drawW = drawH * aspect;
  } else {
    drawW = imgW;
    drawH = drawW / aspect;
  }

  const maxOffsetX = imgW - drawW;
  const maxOffsetY = imgH - drawH;
  let sx = 0, sy = 0, sw = drawW, sh = drawH;

  switch (style) {
    case "none": {
      sx = (imgW - drawW) / 2;
      sy = (imgH - drawH) / 2;
      break;
    }
    case "zoom-in": {
      const scale = 1 + eased * 0.35;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (imgW - cw) / 2; sy = (imgH - ch) / 2;
      sw = cw; sh = ch;
      break;
    }
    case "zoom-out": {
      const scale = 1.35 - eased * 0.35;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (imgW - cw) / 2; sy = (imgH - ch) / 2;
      sw = cw; sh = ch;
      break;
    }
    case "pan-left": {
      sx = maxOffsetX * (1 - eased); sy = (imgH - drawH) / 2;
      break;
    }
    case "pan-right": {
      sx = maxOffsetX * eased; sy = (imgH - drawH) / 2;
      break;
    }
    case "pan-up": {
      sx = (imgW - drawW) / 2; sy = maxOffsetY * (1 - eased);
      break;
    }
    case "ken-burns": {
      const scale = 1 + eased * 0.3;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (imgW - cw) * eased * 0.4;
      sy = (imgH - ch) * (1 - eased) * 0.4;
      sw = cw; sh = ch;
      break;
    }
    case "drift": {
      const scale = 1 + eased * 0.15;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (imgW - cw) * eased * 0.6;
      sy = (imgH - ch) * eased * 0.4;
      sw = cw; sh = ch;
      break;
    }
    case "dramatic-zoom": {
      const dramatic = 1 - Math.pow(1 - t, 3);
      const scale = 1 + dramatic * 0.5;
      const cw = drawW / scale, ch = drawH / scale;
      sx = (imgW - cw) / 2; sy = (imgH - ch) / 2;
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

async function loadVideo(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true; // mute for rendering, audio is handled separately
  video.preload = "auto";
  return new Promise((resolve, reject) => {
    video.onloadeddata = () => resolve(video);
    video.onerror = reject;
    video.src = src;
  });
}

export function useVideoGenerator(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const generate = useCallback(
    async (
      mediaItems: MediaItem[],
      platform: PlatformPreset,
      watermark: boolean = true,
      watermarkColor: string = "white",
      globalAudioTracks: AudioTrackInput[] = []
    ): Promise<string> => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not ready");

      const ctx = canvas.getContext("2d")!;
      const { width: W, height: H } = PLATFORM_PRESETS[platform];
      canvas.width = W;
      canvas.height = H;

      const fps = 30;
      const videoStream = canvas.captureStream(fps);

      // Collect all audio sources: global tracks + per-item audio
      const allAudioFiles: { file: File; startTime: number }[] = [];

      // Global background audio starts at 0
      for (const track of globalAudioTracks) {
        allAudioFiles.push({ file: track.file, startTime: 0 });
      }

      // Per-item audio starts at the cumulative offset
      let offset = 0;
      for (const item of mediaItems) {
        if (item.audio) {
          allAudioFiles.push({ file: item.audio.file, startTime: offset });
        }
        offset += item.duration;
      }

      const hasAudio = allAudioFiles.length > 0;
      let audioCtx: AudioContext | null = null;
      let dest: MediaStreamAudioDestinationNode | null = null;
      let sources: AudioBufferSourceNode[] = [];

      if (hasAudio) {
        audioCtx = new AudioContext();
        dest = audioCtx.createMediaStreamDestination();

        for (const entry of allAudioFiles) {
          const arrayBuffer = await entry.file.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(dest);
          source.start(entry.startTime);
          sources.push(source);
        }
      }

      const combinedTracks = [
        ...videoStream.getVideoTracks(),
        ...(dest ? dest.stream.getAudioTracks() : []),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = hasAudio
        ? "video/webm;codecs=vp9,opus"
        : "video/webm;codecs=vp9";

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
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

      for (const item of mediaItems) {
        if (item.type === "video" && item.videoFile) {
          // Render video clip frames
          const videoEl = await loadVideo(URL.createObjectURL(item.videoFile));
          const videoDuration = item.duration;
          const totalFrames = Math.ceil(videoDuration * fps);

          videoEl.currentTime = 0;
          await new Promise<void>((r) => {
            videoEl.onseeked = () => r();
            videoEl.currentTime = 0;
          });

          videoEl.play();

          for (let frame = 0; frame < totalFrames; frame++) {
            ctx.clearRect(0, 0, W, H);
            // Draw video frame fitted to canvas
            const vw = videoEl.videoWidth;
            const vh = videoEl.videoHeight;
            const scale = Math.min(W / vw, H / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            const dx = (W - dw) / 2;
            const dy = (H - dh) / 2;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(videoEl, dx, dy, dw, dh);
            if (watermark) drawWatermark(ctx, W, H, watermarkColor);
            await new Promise((r) => setTimeout(r, 1000 / fps));
          }

          videoEl.pause();
          URL.revokeObjectURL(videoEl.src);
        } else {
          // Render image with animation
          const img = await loadImage(item.src);
          const totalFrames = item.duration * fps;

          for (let frame = 0; frame < totalFrames; frame++) {
            const t = frame / totalFrames;
            renderFrame(ctx, img, W, H, t, item.style);
            if (watermark) drawWatermark(ctx, W, H, watermarkColor);
            await new Promise((r) => setTimeout(r, 1000 / fps));
          }
        }
      }

      recorder.stop();
      await done;

      sources.forEach((s) => { try { s.stop(); } catch {} });
      if (audioCtx) await audioCtx.close();

      const blob = new Blob(chunks, { type: "video/webm" });
      return URL.createObjectURL(blob);
    },
    [canvasRef]
  );

  return { generate };
}
