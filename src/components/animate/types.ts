export type AnimationStyle = "none" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "pan-up" | "ken-burns" | "drift" | "dramatic-zoom";

export type PlatformPreset = "youtube" | "tiktok" | "facebook" | "custom";

export interface PlatformConfig {
  label: string;
  width: number;
  height: number;
  desc: string;
}

export const ANIMATION_STYLES: { value: AnimationStyle; label: string; desc: string }[] = [
  { value: "none", label: "None", desc: "No animation, static display" },
  { value: "zoom-in", label: "Zoom In", desc: "Smooth zoom into focal point" },
  { value: "zoom-out", label: "Zoom Out", desc: "Reveal zoom from center" },
  { value: "pan-left", label: "Pan Left", desc: "Cinematic horizontal sweep" },
  { value: "pan-right", label: "Pan Right", desc: "Reverse horizontal sweep" },
  { value: "pan-up", label: "Pan Up", desc: "Vertical rise reveal" },
  { value: "ken-burns", label: "Ken Burns", desc: "Classic zoom + drift combo" },
  { value: "drift", label: "Drift", desc: "Gentle diagonal float" },
  { value: "dramatic-zoom", label: "Dramatic", desc: "Fast zoom with slow ease" },
];

export const PLATFORM_PRESETS: Record<PlatformPreset, PlatformConfig> = {
  youtube: { label: "YouTube", width: 1920, height: 1080, desc: "16:9 landscape" },
  tiktok: { label: "TikTok", width: 1080, height: 1920, desc: "9:16 portrait" },
  facebook: { label: "Facebook", width: 1080, height: 1080, desc: "1:1 square" },
  custom: { label: "HD 720p", width: 1280, height: 720, desc: "16:9 standard" },
};
