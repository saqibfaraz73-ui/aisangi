import AppHeader from "@/components/AppHeader";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode, FileDown, ArrowLeftRight, Palette, Type, FileText,
  Droplets, LayoutGrid, PenTool, Layers, CropIcon, Scissors, ScanText, FileEdit, UtensilsCrossed, Heart
} from "lucide-react";

const TOOLS = [
  { to: "/tools/qr-code", label: "QR Code Generator", desc: "URLs, text, WiFi, vCards with custom colors", icon: QrCode },
  { to: "/tools/image-compressor", label: "Image Compressor", desc: "Compress PNG/JPG/WebP with quality control", icon: FileDown },
  { to: "/tools/format-converter", label: "Format Converter", desc: "Convert between PNG, JPG, WebP, BMP, GIF", icon: ArrowLeftRight },
  { to: "/tools/color-picker", label: "Color Picker", desc: "Extract colors & generate palettes", icon: Palette },
  { to: "/tools/meme-generator", label: "Meme Generator", desc: "Add text overlays with custom fonts", icon: Type },
  { to: "/tools/screenshot-to-pdf", label: "Screenshot to PDF", desc: "Combine multiple images into PDF", icon: FileText },
  { to: "/tools/image-watermark", label: "Image Watermark", desc: "Add text/image watermarks with controls", icon: Droplets },
  { to: "/tools/photo-collage", label: "Photo Collage", desc: "Grid & freestyle collage layouts", icon: LayoutGrid },
  { to: "/tools/svg-editor", label: "SVG / Icon Maker", desc: "Simple vector drawing for icons & shapes", icon: PenTool },
  { to: "/tools/text-behind-image", label: "Text Behind Image", desc: "Place text behind photo subjects", icon: Layers },
  { to: "/tools/image-cropper", label: "Image Cropper", desc: "Free-form & aspect-ratio locked cropping", icon: CropIcon },
  { to: "/tools/video-trimmer", label: "Video Trimmer", desc: "Trim/cut videos locally in browser", icon: Scissors },
  { to: "/tools/image-to-text", label: "Image to Text", desc: "Extract copyable text from images (OCR)", icon: ScanText },
  { to: "/tools/pdf-editor", label: "PDF Reader & Editor", desc: "View, edit, merge, annotate PDF files", icon: FileEdit },
  { to: "/poster-generator?category=Menu+Card", label: "Menu Card Maker", desc: "Create restaurant menus & deal posters", icon: UtensilsCrossed },
  { to: "/poster-generator?category=Invitation+Card", label: "Invitation Card Maker", desc: "Wedding, Nikah, party & business invite cards", icon: Heart },
];

const ToolsPage = () => (
  <div className="min-h-screen bg-background">
    <AppHeader />
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-display font-bold text-foreground mb-6">Free Tools</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TOOLS.map((t, i) => (
          <motion.div key={t.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <NavLink
              to={t.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-glow transition-all text-center group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <t.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{t.label}</span>
              <span className="text-xs text-muted-foreground leading-tight">{t.desc}</span>
            </NavLink>
          </motion.div>
        ))}
      </div>
    </main>
  </div>
);

export default ToolsPage;
