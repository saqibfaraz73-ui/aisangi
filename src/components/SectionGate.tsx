import { useSectionAccess } from "@/hooks/use-section-access";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  section: string;
  children: React.ReactNode;
}

const SectionGate = ({ section, children }: Props) => {
  const { canAccess, loading } = useSectionAccess();
  const navigate = useNavigate();
  const access = canAccess(section);

  if (loading) return null;

  if (access === "hidden") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Section Unavailable</h2>
        <p className="text-muted-foreground text-center max-w-md">This section is currently disabled by the administrator.</p>
        <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
      </div>
    );
  }

  if (access === "premium_locked") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Crown className="h-16 w-16 text-yellow-500" />
        <h2 className="text-xl font-bold text-foreground">Premium Feature</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This section is available for premium users only. Upgrade to premium to unlock this feature.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default SectionGate;
