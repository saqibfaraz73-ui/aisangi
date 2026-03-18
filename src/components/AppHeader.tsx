import { Wand2, LogOut, Shield, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Text to Image" },
  { to: "/animate", label: "Image to Video" },
  { to: "/overlay", label: "Audio Overlay" },
  { to: "/script-generator", label: "Script AI" },
];

const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const navLinks = (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
              isMobile && "text-sm px-4 py-2.5 w-full text-left"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
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
              isMobile && "text-sm px-4 py-2.5 w-full"
            )
          }
        >
          <Shield className="h-3 w-3" />
          Admin
        </NavLink>
      )}
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); setOpen(false); }}
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground",
            isMobile ? "text-sm justify-start w-full mt-2" : "ml-2"
          )}
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign Out
        </Button>
      )}
    </>
  );

  return (
    <header className="border-b border-border px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Wand2 className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-xl text-foreground tracking-tight">
            SangiAI
          </h1>
        </NavLink>

        {isMobile ? (
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
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="flex items-center gap-1">
            {navLinks}
          </nav>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
