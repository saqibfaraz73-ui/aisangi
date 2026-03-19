import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { BarChart3, CalendarIcon, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface UsageStatsProps {
  users: Profile[];
}

interface UserStats {
  userId: string;
  email: string;
  fullName: string | null;
  text_to_image: number;
  image_to_video: number;
  script_ai: number;
  audio_overlay: number;
  voice_tts: number;
  music_gen: number;
  tokens: number;
  total: number;
}

const UsageStatsSection = ({ users }: UsageStatsProps) => {
  const [from, setFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [logs, setLogs] = useState<{ user_id: string; section: string; tokens_used: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    if (!from || !to) return;
    setLoading(true);
    const startISO = from.toISOString();
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    const endISO = endDate.toISOString();

    const { data } = await supabase
      .from("usage_log")
      .select("user_id, section, tokens_used")
      .gte("used_at", startISO)
      .lte("used_at", endISO);

    setLogs((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats: UserStats[] = useMemo(() => {
    const map: Record<string, UserStats> = {};
    for (const u of users) {
      map[u.id] = {
        userId: u.id,
        email: u.email,
        fullName: u.full_name,
        text_to_image: 0,
        image_to_video: 0,
        script_ai: 0,
        audio_overlay: 0,
        voice_tts: 0,
        music_gen: 0,
        tokens: 0,
        total: 0,
      };
    }
    for (const log of logs) {
      if (!map[log.user_id]) continue;
      const section = log.section as keyof Pick<UserStats, "text_to_image" | "image_to_video" | "script_ai" | "audio_overlay" | "voice_tts" | "music_gen">;
      if (section in map[log.user_id] && typeof map[log.user_id][section] === "number") {
        (map[log.user_id][section] as number)++;
        map[log.user_id].total++;
        map[log.user_id].tokens += (log.tokens_used || 0);
      }
    }
    return Object.values(map)
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [users, logs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stats;
    const q = search.toLowerCase();
    return stats.filter(
      (s) => s.email.toLowerCase().includes(q) || (s.fullName || "").toLowerCase().includes(q)
    );
  }, [stats, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, s) => ({
        text_to_image: acc.text_to_image + s.text_to_image,
        image_to_video: acc.image_to_video + s.image_to_video,
        script_ai: acc.script_ai + s.script_ai,
        audio_overlay: acc.audio_overlay + s.audio_overlay,
        voice_tts: acc.voice_tts + s.voice_tts,
        tokens: acc.tokens + s.tokens,
        total: acc.total + s.total,
      }),
      { text_to_image: 0, image_to_video: 0, script_ai: 0, audio_overlay: 0, voice_tts: 0, tokens: 0, total: 0 }
    );
  }, [filtered]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Usage Statistics</h2>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[150px] justify-start text-left font-normal text-sm", !from && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {from ? format(from, "MMM dd, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[150px] justify-start text-left font-normal text-sm", !to && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {to ? format(to, "MMM dd, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={fetchLogs} disabled={loading} size="sm" className="h-9">
            {loading ? "Loading..." : "Apply"}
          </Button>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-48 text-sm bg-background border-border"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 p-4 border-b border-border">
        {[
          { label: "Images", value: totals.text_to_image, color: "text-blue-500" },
          { label: "Videos", value: totals.image_to_video, color: "text-purple-500" },
          { label: "Scripts", value: totals.script_ai, color: "text-green-500" },
          { label: "Audio", value: totals.audio_overlay, color: "text-orange-500" },
          { label: "Voice", value: totals.voice_tts, color: "text-pink-500" },
          { label: "Tokens", value: totals.tokens, color: "text-yellow-500" },
          { label: "Total", value: totals.total, color: "text-primary" },
        ].map((item) => (
          <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
            <p className={cn("text-2xl font-bold", item.color)}>{item.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="text-center">Images</TableHead>
            <TableHead className="text-center">Videos</TableHead>
            <TableHead className="text-center">Scripts</TableHead>
            <TableHead className="text-center">Audio</TableHead>
            <TableHead className="text-center">Voice</TableHead>
            <TableHead className="text-center">Tokens</TableHead>
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.userId}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{s.fullName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
              </TableCell>
              <TableCell className="text-center">{s.text_to_image}</TableCell>
              <TableCell className="text-center">{s.image_to_video}</TableCell>
              <TableCell className="text-center">{s.script_ai}</TableCell>
              <TableCell className="text-center">{s.audio_overlay}</TableCell>
              <TableCell className="text-center">{s.voice_tts}</TableCell>
              <TableCell className="text-center font-mono text-xs">{s.tokens.toLocaleString()}</TableCell>
              <TableCell className="text-center font-bold">{s.total}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No usage data for this period
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UsageStatsSection;
