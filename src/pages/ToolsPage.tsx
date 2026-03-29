import AppHeader from "@/components/AppHeader";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode, FileDown, ArrowLeftRight, Palette, Type, FileText,
  Droplets, LayoutGrid, PenTool, Layers, CropIcon, Scissors, ScanText, FileEdit, UtensilsCrossed, Heart, Image, ImagePlus, CreditCard, NotebookPen, FileUser, Signature, BookOpen, GraduationCap,
  RefreshCw, LetterText, Library, Sparkles, Presentation, Search, FunctionSquare, FlipVertical, CalendarCheck, BarChart3, ClipboardList, Bookmark, PenLine, Network, Crown
} from "lucide-react";

const FREE_TOOLS = [
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
  { to: "/invitation-card", label: "Invitation Card Maker", desc: "Wedding, Nikah, Walima & Party cards", icon: Heart },
  { to: "/poster-generator", label: "Poster Maker", desc: "Design posters with templates & custom sizes", icon: Image },
  { to: "/image-editor", label: "Image Editor", desc: "Edit, resize & enhance your images", icon: ImagePlus },
  { to: "/poster-generator?category=Business+Card", label: "Business Card Maker", desc: "Design professional visiting cards", icon: CreditCard },
  { to: "/poster-generator?category=Business+Pad", label: "Business Pad Maker", desc: "Create letterheads & notepads", icon: NotebookPen },
  { to: "/tools/cv-generator", label: "CV / Resume Maker", desc: "Professional CV with photo & PDF export", icon: FileUser },
  { to: "/tools/digital-signature", label: "Digital Signature", desc: "Draw signature, save or place on documents", icon: Signature },
  { to: "/tools/word-counter", label: "Word Counter", desc: "Word count, reading time, Flesch score", icon: LetterText },
  { to: "/tools/bibliography-maker", label: "Bibliography Maker", desc: "Build & export full reference lists", icon: Library },
  { to: "/tools/citation-generator", label: "Citation Generator", desc: "APA, MLA, Chicago, Harvard, IEEE", icon: BookOpen },
  { to: "/tools/thesis-formatter", label: "Thesis Formatter", desc: "Format thesis & synopsis with settings", icon: GraduationCap },
  { to: "/tools/plagiarism-checker", label: "Text Similarity Checker", desc: "Compare two texts for similarity", icon: Search },
  { to: "/tools/math-equation", label: "Math Equation Editor", desc: "LaTeX-style equations with image export", icon: FunctionSquare },
  { to: "/tools/flashcard-generator", label: "Flashcard Generator", desc: "Create study cards from notes", icon: FlipVertical },
  { to: "/tools/assignment-planner", label: "Assignment Planner", desc: "Deadline calendar with reminders", icon: CalendarCheck },
  { to: "/tools/csv-viewer", label: "CSV/Excel Viewer", desc: "Upload data, generate charts", icon: BarChart3 },
  { to: "/tools/survey-builder", label: "Survey / Form Builder", desc: "Create simple surveys & forms", icon: ClipboardList },
  { to: "/tools/reference-manager", label: "Reference Manager", desc: "Save & organize research papers", icon: Bookmark },
  { to: "/tools/text-to-handwriting", label: "Text to Handwriting", desc: "Convert text to handwritten images", icon: PenLine },
  { to: "/tools/notes-to-mindmap", label: "Notes to Mind Map", desc: "Visual mind map from bullet points", icon: Network },
];

const AI_TOOLS = [
  { to: "/tools/paraphrase", label: "AI Paraphrase", desc: "AI-powered text rewriting", icon: RefreshCw },
  { to: "/tools/ai-summarizer", label: "AI Summarizer", desc: "Get concise summaries of articles", icon: Sparkles },
  { to: "/tools/presentation-maker", label: "Presentation Maker", desc: "AI slide decks from outlines", icon: Presentation },
];

const ToolCard = ({ t, i }: { t: typeof FREE_TOOLS[0]; i: number }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
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
);

const ToolsPage = () => (
  <div className="min-h-screen bg-background">
    <AppHeader />
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-display font-bold text-foreground mb-6">Free Tools</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
        {FREE_TOOLS.map((t, i) => <ToolCard key={t.to} t={t} i={i} />)}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Crown className="h-5 w-5 text-yellow-500" />
        <h2 className="text-2xl font-display font-bold text-foreground">AI-Powered Tools</h2>
        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded-full font-medium">Premium</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {AI_TOOLS.map((t, i) => <ToolCard key={t.to} t={t} i={i} />)}
      </div>
    </main>
  </div>
);

export default ToolsPage;
