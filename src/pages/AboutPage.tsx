import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Info } from "lucide-react";

export default function AboutPage() {
  const [content, setContent] = useState("Loading...");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "about_app")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContent(data.value);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Info className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">About App</h1>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
          {content}
        </div>
      </main>
    </div>
  );
}
