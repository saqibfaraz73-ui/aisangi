import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
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

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/animate" element={<ProtectedRoute><AnimatePage /></ProtectedRoute>} />
    <Route path="/image-editor" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />
    <Route path="/overlay" element={<ProtectedRoute><OverlayPage /></ProtectedRoute>} />
    <Route path="/lip-sync" element={<ProtectedRoute><LipSyncPage /></ProtectedRoute>} />
    <Route path="/script-generator" element={<ProtectedRoute><ScriptGeneratorPage /></ProtectedRoute>} />
    <Route path="/voice-generator" element={<ProtectedRoute><VoiceGeneratorPage /></ProtectedRoute>} />
    <Route path="/music-generator" element={<ProtectedRoute><MusicGeneratorPage /></ProtectedRoute>} />
    <Route path="/poster-generator" element={<ProtectedRoute><PosterGeneratorPage /></ProtectedRoute>} />
    <Route path="/prompt-generator" element={<ProtectedRoute><PromptGeneratorPage /></ProtectedRoute>} />
    <Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
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
    <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

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
