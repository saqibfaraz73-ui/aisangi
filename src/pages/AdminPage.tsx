import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import UserSearch from "@/components/admin/UserSearch";
import GlobalLimitsSection from "@/components/admin/GlobalLimitsSection";
import type { UsageLimit } from "@/components/admin/GlobalLimitsSection";
import UserLimitsSection from "@/components/admin/UserLimitsSection";
import type { UserUsageLimit } from "@/components/admin/UserLimitsSection";
import AdminPasswordSection from "@/components/admin/AdminPasswordSection";
import WatermarkSection from "@/components/admin/WatermarkSection";
import UsageStatsSection from "@/components/admin/UsageStatsSection";
import ApiSettingsSection from "@/components/admin/ApiSettingsSection";
import ElevenLabsSection from "@/components/admin/ElevenLabsSection";
import GlobalCapSection from "@/components/admin/GlobalCapSection";
import LipSyncSection from "@/components/admin/LipSyncSection";
import RateLimitSection from "@/components/admin/RateLimitSection";
import TrafficStatsSection from "@/components/admin/TrafficStatsSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [limits, setLimits] = useState<UsageLimit[]>([]);
  const [userLimits, setUserLimits] = useState<UserUsageLimit[]>([]);
  const [editedLimits, setEditedLimits] = useState<Record<string, number>>({});
  const [editedTypes, setEditedTypes] = useState<Record<string, string>>({});
  const [savingLimits, setSavingLimits] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [usersRes, limitsRes, userLimitsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("usage_limits").select("*").order("section"),
      supabase.from("user_usage_limits").select("*"),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (limitsRes.data) {
      setLimits(limitsRes.data as UsageLimit[]);
      const initLimits: Record<string, number> = {};
      const initTypes: Record<string, string> = {};
      limitsRes.data.forEach((l: any) => {
        initLimits[l.id] = l.daily_limit;
        initTypes[l.id] = l.limit_type || "per_day";
      });
      setEditedLimits(initLimits);
      setEditedTypes(initTypes);
    }
    if (userLimitsRes.data) setUserLimits(userLimitsRes.data as UserUsageLimit[]);
    setLoadingData(false);
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    try {
      for (const limit of limits) {
        const newLimit = editedLimits[limit.id];
        const newType = editedTypes[limit.id];
        if (newLimit !== limit.daily_limit || newType !== limit.limit_type) {
          const { error } = await supabase
            .from("usage_limits")
            .update({ daily_limit: newLimit, limit_type: newType, updated_at: new Date().toISOString() })
            .eq("id", limit.id);
          if (error) throw error;
        }
      }
      toast({ title: "Global limits updated!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to update limits", description: err.message, variant: "destructive" });
    } finally {
      setSavingLimits(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q)
    );
  }, [users, search]);

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
          <p className="text-muted-foreground text-sm">Manage users, limits, and settings.</p>
        </motion.div>

        <TrafficStatsSection />

        <ApiSettingsSection />

        <ElevenLabsSection />

        <GlobalCapSection />

        <LipSyncSection />

        <RateLimitSection />

        <WatermarkSection users={users} />

        <GlobalLimitsSection
          limits={limits}
          editedLimits={editedLimits}
          editedTypes={editedTypes}
          onLimitChange={(id, v) => setEditedLimits((p) => ({ ...p, [id]: v }))}
          onTypeChange={(id, v) => setEditedTypes((p) => ({ ...p, [id]: v }))}
          onSave={saveLimits}
          saving={savingLimits}
        />

        <UserLimitsSection users={users} userLimits={userLimits} onRefresh={fetchData} />

        <UsageStatsSection users={users} />

        {/* Users Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-lg text-foreground">
                Registered Users ({filteredUsers.length})
              </h2>
            </div>
            <div className="w-full sm:w-64">
              <UserSearch value={search} onChange={setSearch} />
            </div>
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
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {search ? "No users match your search" : "No users registered yet"}
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
