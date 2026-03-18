import { Wand2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Text to Image" },
  { to: "/animate", label: "Image to Video" },
  { to: "/overlay", label: "Audio Overlay" },
];

const AppHeader = () => {
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
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
