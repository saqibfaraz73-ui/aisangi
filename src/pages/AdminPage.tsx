import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Settings, Shield, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UsageLimit {
  id: string;
  section: string;
  daily_limit: number;
}

const SECTION_LABELS: Record<string, string> = {
  text_to_image: "Text to Image",
  image_to_video: "Image to Video",
  audio_overlay: "Audio Overlay",
  script_ai: "Script AI",
};

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [limits, setLimits] = useState<UsageLimit[]>([]);
  const [editedLimits, setEditedLimits] = useState<Record<string, number>>({});
  const [savingLimits, setSavingLimits] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [usersRes, limitsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("usage_limits").select("*").order("section"),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (limitsRes.data) {
      setLimits(limitsRes.data);
      const initial: Record<string, number> = {};
      limitsRes.data.forEach((l) => (initial[l.id] = l.daily_limit));
      setEditedLimits(initial);
    }
    setLoadingData(false);
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    try {
      for (const limit of limits) {
        const newLimit = editedLimits[limit.id];
        if (newLimit !== limit.daily_limit) {
          const { error } = await supabase
            .from("usage_limits")
            .update({ daily_limit: newLimit, updated_at: new Date().toISOString() })
            .eq("id", limit.id);
          if (error) throw error;
        }
      }
      toast({ title: "Usage limits updated!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to update limits", description: err.message, variant: "destructive" });
    } finally {
      setSavingLimits(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display font-extrabold text-3xl text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage users and usage limits.</p>
        </motion.div>

        {/* Usage Limits */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              <h2 className="font-display font-bold text-lg text-foreground">Daily Usage Limits</h2>
            </div>
            <Button onClick={saveLimits} disabled={savingLimits} size="sm">
              {savingLimits ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {limits.map((limit) => (
              <div key={limit.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <span className="text-sm font-medium text-foreground flex-1">
                  {SECTION_LABELS[limit.section] || limit.section}
                </span>
                <Input
                  type="number"
                  min={0}
                  value={editedLimits[limit.id] ?? limit.daily_limit}
                  onChange={(e) =>
                    setEditedLimits((prev) => ({ ...prev, [limit.id]: parseInt(e.target.value) || 0 }))
                  }
                  className="w-20 text-center bg-card border-border"
                />
                <span className="text-xs text-muted-foreground">/day</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-foreground">
              Registered Users ({users.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No users registered yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPage;
