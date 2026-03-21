export interface PosterSize {
  label: string;
  width: number;
  height: number;
  category: string;
}

export interface TemplateElement {
  id: string;
  type: "text" | "rect" | "circle" | "image";
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number; // percentage of canvas height
  fontWeight?: string;
  color?: string;
  bgColor?: string;
  borderRadius?: number;
  textAlign?: "left" | "center" | "right";
  direction?: "rtl" | "ltr";
  opacity?: number;
  editable?: boolean;
  isPhoto?: boolean;
  lineHeight?: number;
}

export interface PosterTemplate {
  id: string;
  name: string;
  nameUrdu?: string;
  category: string;
  bgColor: string;
  bgGradient?: string;
  elements: TemplateElement[];
  thumbnail?: string;
}

export const POSTER_SIZES: PosterSize[] = [
  // Social Media
  { label: "Instagram Post", width: 1080, height: 1080, category: "Social Media" },
  { label: "Instagram Story", width: 1080, height: 1920, category: "Social Media" },
  { label: "Facebook Post", width: 1200, height: 630, category: "Social Media" },
  { label: "Facebook Cover", width: 820, height: 312, category: "Social Media" },
  { label: "WhatsApp Status", width: 1080, height: 1920, category: "Social Media" },
  { label: "YouTube Thumbnail", width: 1280, height: 720, category: "Social Media" },
  // Print
  { label: "A4 Portrait", width: 2480, height: 3508, category: "Print (A4/A3)" },
  { label: "A4 Landscape", width: 3508, height: 2480, category: "Print (A4/A3)" },
  { label: "A3 Portrait", width: 3508, height: 4961, category: "Print (A4/A3)" },
  { label: "A3 Landscape", width: 4961, height: 3508, category: "Print (A4/A3)" },
  // Flex/Pana
  { label: "3x5 ft Banner", width: 3600, height: 6000, category: "Flex/Pana" },
  { label: "4x6 ft Banner", width: 4800, height: 7200, category: "Flex/Pana" },
  { label: "5x3 ft Banner (Landscape)", width: 6000, height: 3600, category: "Flex/Pana" },
  { label: "6x4 ft Banner (Landscape)", width: 7200, height: 4800, category: "Flex/Pana" },
  { label: "2x5 ft Standee", width: 2400, height: 6000, category: "Flex/Pana" },
];
