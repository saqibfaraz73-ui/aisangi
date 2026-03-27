import { useState, useEffect, useMemo } from "react";
import { Crown, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import UserSearch from "./UserSearch";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface PremiumUser {
  id: string;
  user_id: string;
  source: string;
  granted_at: string;
}

interface Props {
  users: Profile[];
}

const PremiumUsersSection = ({ users }: Props) => {
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPremium = async () => {
    const { data } = await supabase.from("premium_users").select("*").order("granted_at", { ascending: false });
    if (data) setPremiumUsers(data as PremiumUser[]);
    setLoading(false);
  };

  useEffect(() => { fetchPremium(); }, []);

  const premiumUserIds = new Set(premiumUsers.map((p) => p.user_id));

  const filteredUsers = useMemo(() => {
    const nonPremium = users.filter((u) => !premiumUserIds.has(u.id));
    if (!userSearch.trim()) return nonPremium;
    const q = userSearch.toLowerCase();
    return nonPremium.filter((u) => u.email.toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q));
  }, [users, userSearch, premiumUserIds]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("premium_users").insert({
        user_id: selectedUser,
        source: "manual",
        granted_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Premium access granted!" });
      setSelectedUser("");
      fetchPremium();
    } catch (err: any) {
      toast({ title: "Failed to add", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from("premium_users").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Premium access removed" });
      fetchPremium();
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    }
  };

  const getUserInfo = (userId: string) => users.find((u) => u.id === userId);

  if (loading) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-yellow-500" />
        <h2 className="font-display font-bold text-lg text-foreground">Premium Users</h2>
        <Badge variant="secondary" className="ml-2">{premiumUsers.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Manage premium users who can access premium-only sections. Users can also be added via Play Store integration.
      </p>

      {/* Add user */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 space-y-2">
          <UserSearch value={userSearch} onChange={setUserSearch} />
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Select a user to grant premium..." />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving || !selectedUser} className="self-end">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Add Premium
        </Button>
      </div>

      {/* List */}
      {premiumUsers.length > 0 && (
        <div className="space-y-2">
          {premiumUsers.map((p) => {
            const info = getUserInfo(p.user_id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <Crown className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {info?.full_name || info?.email || p.user_id}
                  </p>
                  {info?.email && <p className="text-xs text-muted-foreground truncate">{info.email}</p>}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {p.source === "playstore" ? "Play Store" : "Manual"}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(p.granted_at).toLocaleDateString()}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(p.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {premiumUsers.length === 0 && (
        <p className="text-sm text-muted-foreground">No premium users yet.</p>
      )}
    </div>
  );
};

export default PremiumUsersSection;
