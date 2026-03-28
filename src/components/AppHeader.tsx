import { Wand2, LogOut, Shield, Menu, Crown, Info, Lock } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSectionAccess } from "@/hooks/use-section-access";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { to: "/", label: "Tools" },
  { to: "/text-to-image", label: "Text to Image", section: "text_to_image" },
  { to: "/animate", label: "Image to Video", section: "image_to_video" },
  { to: "/image-editor", label: "Image Editor" },
  { to: "/lip-sync", label: "Lip-Sync", section: "lip_sync" },
  { to: "/overlay", label: "Audio Overlay" },
  { to: "/script-generator", label: "Script AI", section: "script_ai" },
  { to: "/voice-generator", label: "Voice AI", section: "voice_generator" },
  { to: "/music-generator", label: "Music AI", section: "music_generator" },
  { to: "/poster-generator", label: "Poster" },
  { to: "/prompt-generator", label: "Prompt AI", section: "prompt_generator" },
];

const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { canAccess, isPremium } = useSectionAccess();
  const [open, setOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(true);
  const [playStoreUrl, setPlayStoreUrl] = useState("");

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "play_store_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPlayStoreUrl(data.value);
      });
  }, []);

  const navLinks = (
    <>
      {NAV_ITEMS.filter((item) => {
        if (!item.section) return true;
        const access = canAccess(item.section);
        return access !== "hidden";
      }).map((item) => {
        const access = item.section ? canAccess(item.section) : "allowed";
        const isPremiumLocked = access === "premium_locked";
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
                isNarrow && "text-sm px-4 py-2.5 w-full text-left",
                isPremiumLocked && "opacity-70"
              )
            }
          >
            {item.label}
            {isPremiumLocked && <Crown className="h-3 w-3 text-yellow-500" />}
          </NavLink>
        );
      })}
      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted",
              isNarrow && "text-sm px-4 py-2.5 w-full"
            )
          }
        >
          <Shield className="h-3 w-3" />
          Admin
        </NavLink>
      )}
    </>
  );

  const bottomLinks = (
    <div className={cn("flex gap-1", isNarrow ? "flex-col mt-4 border-t border-border pt-4" : "items-center ml-2")}>
      <NavLink
        to="/privacy"
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            "text-xs px-3 py-1.5 rounded-full transition-colors",
            isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
            isNarrow && "text-sm px-4 py-2.5 w-full text-left"
          )
        }
      >
        Privacy
      </NavLink>
      <NavLink
        to="/about"
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            "text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1",
            isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
            isNarrow && "text-sm px-4 py-2.5 w-full text-left"
          )
        }
      >
        <Info className="h-3 w-3" /> About
      </NavLink>
      {!isPremium && !isAdmin && playStoreUrl && (
        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white flex items-center gap-1 hover:opacity-90 transition-opacity",
            isNarrow && "text-sm px-4 py-2.5 w-full justify-center"
          )}
        >
          <Crown className="h-3 w-3" /> Upgrade to Premium
        </a>
      )}
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); setOpen(false); }}
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground",
            isNarrow ? "text-sm justify-start w-full mt-2" : "ml-1"
          )}
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign Out
        </Button>
      )}
    </div>
  );

  return (
    <header className="border-b border-border px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between overflow-hidden">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Wand2 className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-xl text-foreground tracking-tight">
            SangiAI
          </h1>
        </NavLink>

        {isNarrow ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-background">
              <SheetTitle className="font-display text-foreground">Menu</SheetTitle>
              <nav className="flex flex-col gap-1 mt-4">
                {navLinks}
                {bottomLinks}
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {navLinks}
            {bottomLinks}
          </nav>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
