import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface SectionVisibility {
  section: string;
  status: string;
}

export function useSectionAccess() {
  const { user, isAdmin } = useAuth();
  const [sections, setSections] = useState<SectionVisibility[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: vis } = await supabase.from("section_visibility").select("section, status");
      if (vis) setSections(vis as SectionVisibility[]);

      if (user) {
        const { data: prem } = await supabase
          .from("premium_users")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsPremium(!!prem);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const canAccess = (section: string): "allowed" | "hidden" | "premium_locked" => {
    if (isAdmin) return "allowed";
    const s = sections.find((v) => v.section === section);
    if (!s || s.status === "enabled") return "allowed";
    if (s.status === "hidden") return "hidden";
    if (s.status === "premium_only") return isPremium ? "allowed" : "premium_locked";
    return "allowed";
  };

  return { canAccess, isPremium, loading };
}
