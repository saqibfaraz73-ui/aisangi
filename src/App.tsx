import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import SectionGate from "@/components/SectionGate";
import { usePageTracker } from "@/hooks/use-page-tracker";
import Index from "./pages/Index.tsx";
import AnimatePage from "./pages/AnimatePage.tsx";
import OverlayPage from "./pages/OverlayPage.tsx";
import ScriptGeneratorPage from "./pages/ScriptGeneratorPage.tsx";
import VoiceGeneratorPage from "./pages/VoiceGeneratorPage.tsx";
import LipSyncPage from "./pages/LipSyncPage.tsx";
import MusicGeneratorPage from "./pages/MusicGeneratorPage.tsx";
import PosterGeneratorPage from "./pages/PosterGeneratorPage.tsx";
import ImageEditorPage from "./pages/ImageEditorPage.tsx";
import PromptGeneratorPage from "./pages/PromptGeneratorPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import ToolsPage from "./pages/ToolsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import QrCodeGeneratorPage from "./pages/tools/QrCodeGeneratorPage.tsx";
import ImageCompressorPage from "./pages/tools/ImageCompressorPage.tsx";
import FormatConverterPage from "./pages/tools/FormatConverterPage.tsx";
import ColorPickerPage from "./pages/tools/ColorPickerPage.tsx";
import MemeGeneratorPage from "./pages/tools/MemeGeneratorPage.tsx";
import ScreenshotToPdfPage from "./pages/tools/ScreenshotToPdfPage.tsx";
import ImageWatermarkPage from "./pages/tools/ImageWatermarkPage.tsx";
import PhotoCollagePage from "./pages/tools/PhotoCollagePage.tsx";
import SvgEditorPage from "./pages/tools/SvgEditorPage.tsx";
import TextBehindImagePage from "./pages/tools/TextBehindImagePage.tsx";
import ImageCropperPage from "./pages/tools/ImageCropperPage.tsx";
import VideoTrimmerPage from "./pages/tools/VideoTrimmerPage.tsx";
import ImageToTextPage from "./pages/tools/ImageToTextPage.tsx";
import PdfEditorPage from "./pages/tools/PdfEditorPage.tsx";
import CvGeneratorPage from "./pages/tools/CvGeneratorPage.tsx";
import DigitalSignaturePage from "./pages/tools/DigitalSignaturePage.tsx";
import CitationGeneratorPage from "./pages/tools/CitationGeneratorPage.tsx";
import ThesisFormatterPage from "./pages/tools/ThesisFormatterPage.tsx";
import InvitationCardPage from "./pages/InvitationCardPage.tsx";
import ParaphraseToolPage from "./pages/tools/ParaphraseToolPage.tsx";
import WordCounterPage from "./pages/tools/WordCounterPage.tsx";
import BibliographyMakerPage from "./pages/tools/BibliographyMakerPage.tsx";
import AiSummarizerPage from "./pages/tools/AiSummarizerPage.tsx";
import PresentationMakerPage from "./pages/tools/PresentationMakerPage.tsx";
import PlagiarismCheckerPage from "./pages/tools/PlagiarismCheckerPage.tsx";
import MathEquationPage from "./pages/tools/MathEquationPage.tsx";
import FlashcardGeneratorPage from "./pages/tools/FlashcardGeneratorPage.tsx";
import AssignmentPlannerPage from "./pages/tools/AssignmentPlannerPage.tsx";
import CsvViewerPage from "./pages/tools/CsvViewerPage.tsx";
import SurveyBuilderPage from "./pages/tools/SurveyBuilderPage.tsx";
import ReferenceManagerPage from "./pages/tools/ReferenceManagerPage.tsx";
import TextToHandwritingPage from "./pages/tools/TextToHandwritingPage.tsx";
import NotesToMindMapPage from "./pages/tools/NotesToMindMapPage.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  usePageTracker();
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
      <Route path="/text-to-image" element={<ProtectedRoute><SectionGate section="text_to_image"><Index /></SectionGate></ProtectedRoute>} />
      <Route path="/animate" element={<ProtectedRoute><SectionGate section="image_to_video"><AnimatePage /></SectionGate></ProtectedRoute>} />
      <Route path="/image-editor" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />
      <Route path="/overlay" element={<ProtectedRoute><OverlayPage /></ProtectedRoute>} />
      <Route path="/lip-sync" element={<ProtectedRoute><SectionGate section="lip_sync"><LipSyncPage /></SectionGate></ProtectedRoute>} />
      <Route path="/script-generator" element={<ProtectedRoute><SectionGate section="script_ai"><ScriptGeneratorPage /></SectionGate></ProtectedRoute>} />
      <Route path="/voice-generator" element={<ProtectedRoute><SectionGate section="voice_generator"><VoiceGeneratorPage /></SectionGate></ProtectedRoute>} />
      <Route path="/music-generator" element={<ProtectedRoute><SectionGate section="music_generator"><MusicGeneratorPage /></SectionGate></ProtectedRoute>} />
      <Route path="/poster-generator" element={<ProtectedRoute><PosterGeneratorPage /></ProtectedRoute>} />
      <Route path="/prompt-generator" element={<ProtectedRoute><SectionGate section="prompt_generator"><PromptGeneratorPage /></SectionGate></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><PrivacyPage /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
      <Route path="/tools/qr-code" element={<ProtectedRoute><QrCodeGeneratorPage /></ProtectedRoute>} />
      <Route path="/tools/image-compressor" element={<ProtectedRoute><ImageCompressorPage /></ProtectedRoute>} />
      <Route path="/tools/format-converter" element={<ProtectedRoute><FormatConverterPage /></ProtectedRoute>} />
      <Route path="/tools/color-picker" element={<ProtectedRoute><ColorPickerPage /></ProtectedRoute>} />
      <Route path="/tools/meme-generator" element={<ProtectedRoute><MemeGeneratorPage /></ProtectedRoute>} />
      <Route path="/tools/screenshot-to-pdf" element={<ProtectedRoute><ScreenshotToPdfPage /></ProtectedRoute>} />
      <Route path="/tools/image-watermark" element={<ProtectedRoute><ImageWatermarkPage /></ProtectedRoute>} />
      <Route path="/tools/photo-collage" element={<ProtectedRoute><PhotoCollagePage /></ProtectedRoute>} />
      <Route path="/tools/svg-editor" element={<ProtectedRoute><SvgEditorPage /></ProtectedRoute>} />
      <Route path="/tools/text-behind-image" element={<ProtectedRoute><TextBehindImagePage /></ProtectedRoute>} />
      <Route path="/tools/image-cropper" element={<ProtectedRoute><ImageCropperPage /></ProtectedRoute>} />
      <Route path="/tools/video-trimmer" element={<ProtectedRoute><VideoTrimmerPage /></ProtectedRoute>} />
      <Route path="/tools/image-to-text" element={<ProtectedRoute><ImageToTextPage /></ProtectedRoute>} />
      <Route path="/tools/pdf-editor" element={<ProtectedRoute><PdfEditorPage /></ProtectedRoute>} />
      <Route path="/tools/cv-generator" element={<ProtectedRoute><CvGeneratorPage /></ProtectedRoute>} />
      <Route path="/tools/digital-signature" element={<ProtectedRoute><DigitalSignaturePage /></ProtectedRoute>} />
      <Route path="/tools/citation-generator" element={<ProtectedRoute><CitationGeneratorPage /></ProtectedRoute>} />
      <Route path="/tools/thesis-formatter" element={<ProtectedRoute><ThesisFormatterPage /></ProtectedRoute>} />
      <Route path="/invitation-card" element={<ProtectedRoute><InvitationCardPage /></ProtectedRoute>} />
      <Route path="/tools/paraphrase" element={<ProtectedRoute><SectionGate section="paraphrase"><ParaphraseToolPage /></SectionGate></ProtectedRoute>} />
      <Route path="/tools/word-counter" element={<ProtectedRoute><WordCounterPage /></ProtectedRoute>} />
      <Route path="/tools/bibliography-maker" element={<ProtectedRoute><BibliographyMakerPage /></ProtectedRoute>} />
      <Route path="/tools/ai-summarizer" element={<ProtectedRoute><SectionGate section="summarizer"><AiSummarizerPage /></SectionGate></ProtectedRoute>} />
      <Route path="/tools/presentation-maker" element={<ProtectedRoute><SectionGate section="presentation"><PresentationMakerPage /></SectionGate></ProtectedRoute>} />
      <Route path="/tools/plagiarism-checker" element={<ProtectedRoute><PlagiarismCheckerPage /></ProtectedRoute>} />
      <Route path="/tools/math-equation" element={<ProtectedRoute><MathEquationPage /></ProtectedRoute>} />
      <Route path="/tools/flashcard-generator" element={<ProtectedRoute><FlashcardGeneratorPage /></ProtectedRoute>} />
      <Route path="/tools/assignment-planner" element={<ProtectedRoute><AssignmentPlannerPage /></ProtectedRoute>} />
      <Route path="/tools/csv-viewer" element={<ProtectedRoute><CsvViewerPage /></ProtectedRoute>} />
      <Route path="/tools/survey-builder" element={<ProtectedRoute><SurveyBuilderPage /></ProtectedRoute>} />
      <Route path="/tools/reference-manager" element={<ProtectedRoute><ReferenceManagerPage /></ProtectedRoute>} />
      <Route path="/tools/text-to-handwriting" element={<ProtectedRoute><TextToHandwritingPage /></ProtectedRoute>} />
      <Route path="/tools/notes-to-mindmap" element={<ProtectedRoute><NotesToMindMapPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
