import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent!", description: "Check your email for a password reset link." });
        setIsForgotPassword(false);
      } catch (err: any) {
        toast({ title: "Failed to send reset link", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/");
      } else {
        if (!fullName.trim()) {
          toast({ title: "Please enter your full name", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account before logging in.",
        });
        setIsLogin(true);
      }
    } catch (err: any) {
      toast({
        title: isLogin ? "Login failed" : "Signup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mx-auto mb-4">
            <Wand2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground">SangiAI</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isForgotPassword ? "Reset your password" : isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="pl-10 bg-background border-border" required={!isLogin} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-background border-border" required />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Password <span className="text-muted-foreground/60">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background border-border" minLength={8} required />
                </div>
              </div>
            )}

            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isForgotPassword ? (
                "Send Reset Link"
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>

            {isForgotPassword && (
              <button type="button" onClick={() => setIsForgotPassword(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            )}
          </div>
        </form>

        {!isForgotPassword && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
