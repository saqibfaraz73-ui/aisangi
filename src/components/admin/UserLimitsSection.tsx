import { useState, useMemo } from "react";
import { UserCog, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SECTION_LABELS, LIMIT_TYPE_LABELS } from "./GlobalLimitsSection";
import UserSearch from "./UserSearch";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserUsageLimit {
  id: string;
  user_id: string;
  section: string;
  custom_limit: number;
  limit_type: string;
}

interface Props {
  users: Profile[];
  userLimits: UserUsageLimit[];
  onRefresh: () => void;
}

const SECTIONS = ["text_to_image", "image_to_video", "audio_overlay", "script_ai"];

const UserLimitsSection = ({ users, userLimits, onRefresh }: Props) => {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editedUserLimits, setEditedUserLimits] = useState<Record<string, { limit: number; type: string }>>({});
  const { toast } = useToast();

  const selectedUserLimits = userLimits.filter((l) => l.user_id === selectedUser);

  const handleAddSection = async (section: string) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_usage_limits").insert({
        user_id: selectedUser,
        section,
        custom_limit: 10,
        limit_type: "per_day",
      });
      if (error) throw error;
      toast({ title: "User limit added" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed to add limit", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserLimits = async () => {
    setSaving(true);
    try {
      for (const [id, values] of Object.entries(editedUserLimits)) {
        const { error } = await supabase
          .from("user_usage_limits")
          .update({ custom_limit: values.limit, limit_type: values.type, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
      toast({ title: "User limits updated!" });
      setEditedUserLimits({});
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("user_usage_limits").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "User limit removed" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const availableSections = SECTIONS.filter(
    (s) => !selectedUserLimits.some((l) => l.section === s)
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <UserCog className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Per-User Limits</h2>
      </div>

      <div className="mb-4">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Select a user..." />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name || u.email} — {u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUser && (
        <>
          {selectedUserLimits.length > 0 && (
            <div className="space-y-3 mb-4">
              {selectedUserLimits.map((ul) => (
                <div key={ul.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm font-medium text-foreground flex-1">
                    {SECTION_LABELS[ul.section] || ul.section}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={editedUserLimits[ul.id]?.limit ?? ul.custom_limit}
                    onChange={(e) =>
                      setEditedUserLimits((prev) => ({
                        ...prev,
                        [ul.id]: { limit: parseInt(e.target.value) || 0, type: prev[ul.id]?.type ?? ul.limit_type },
                      }))
                    }
                    className="w-20 text-center bg-card border-border"
                  />
                  <Select
                    value={editedUserLimits[ul.id]?.type ?? ul.limit_type}
                    onValueChange={(v) =>
                      setEditedUserLimits((prev) => ({
                        ...prev,
                        [ul.id]: { limit: prev[ul.id]?.limit ?? ul.custom_limit, type: v },
                      }))
                    }
                  >
                    <SelectTrigger className="w-28 bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LIMIT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ul.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={handleSaveUserLimits} disabled={saving || Object.keys(editedUserLimits).length === 0} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save User Limits
              </Button>
            </div>
          )}

          {availableSections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Add limit for:</span>
              {availableSections.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => handleAddSection(s)} disabled={saving}>
                  <Plus className="h-3 w-3 mr-1" />
                  {SECTION_LABELS[s]}
                </Button>
              ))}
            </div>
          )}

          {selectedUserLimits.length === 0 && availableSections.length === SECTIONS.length && (
            <p className="text-sm text-muted-foreground">No custom limits set for this user. They use global limits.</p>
          )}
        </>
      )}
    </div>
  );
};

export type { UserUsageLimit };
export default UserLimitsSection;
