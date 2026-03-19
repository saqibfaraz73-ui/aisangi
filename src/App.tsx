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
import AuthPage from "./pages/AuthPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import NotFound from "./pages/NotFound.tsx";
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
    <Route path="/overlay" element={<ProtectedRoute><OverlayPage /></ProtectedRoute>} />
    <Route path="/lip-sync" element={<ProtectedRoute><LipSyncPage /></ProtectedRoute>} />
    <Route path="/script-generator" element={<ProtectedRoute><ScriptGeneratorPage /></ProtectedRoute>} />
    <Route path="/voice-generator" element={<ProtectedRoute><VoiceGeneratorPage /></ProtectedRoute>} />
    <Route path="/music-generator" element={<ProtectedRoute><MusicGeneratorPage /></ProtectedRoute>} />
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
