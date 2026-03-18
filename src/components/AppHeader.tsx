import { Wand2, LogOut, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Text to Image" },
  { to: "/animate", label: "Image to Video" },
  { to: "/overlay", label: "Audio Overlay" },
  { to: "/script-generator", label: "Script AI" },
];

const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();

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
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted"
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
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
