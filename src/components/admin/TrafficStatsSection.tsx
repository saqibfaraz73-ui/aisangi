import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Monitor, Smartphone, Tablet, MapPin, Eye, Users, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface VisitRow {
  id: string;
  user_id: string | null;
  page_path: string;
  device_type: string;
  browser: string;
  os: string;
  country: string;
  city: string;
  session_id: string | null;
  visited_at: string;
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const TrafficStatsSection = () => {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  const fetchVisits = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));

    const { data } = await supabase
      .from("page_visits")
      .select("*")
      .gte("visited_at", since.toISOString())
      .order("visited_at", { ascending: false })
      .limit(1000);

    if (data) setVisits(data as unknown as VisitRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchVisits(); }, [period]);

  // Stats calculations
  const totalVisits = visits.length;
  const uniqueSessions = new Set(visits.map(v => v.session_id).filter(Boolean)).size;
  const uniqueUsers = new Set(visits.map(v => v.user_id).filter(Boolean)).size;

  // Page visits count
  const pageCounts: Record<string, number> = {};
  visits.forEach(v => { pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1; });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Country counts
  const countryCounts: Record<string, number> = {};
  visits.forEach(v => { if (v.country !== "unknown") countryCounts[v.country] = (countryCounts[v.country] || 0) + 1; });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  visits.forEach(v => { deviceCounts[v.device_type] = (deviceCounts[v.device_type] || 0) + 1; });

  // Browser breakdown
  const browserCounts: Record<string, number> = {};
  visits.forEach(v => { browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1; });
  const topBrowsers = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // OS breakdown
  const osCounts: Record<string, number> = {};
  visits.forEach(v => { osCounts[v.os] = (osCounts[v.os] || 0) + 1; });
  const topOS = Object.entries(osCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card mb-6 overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Traffic Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={fetchVisits} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-background p-3 text-center">
            <Eye className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalVisits}</p>
            <p className="text-xs text-muted-foreground">Page Views</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-center">
            <Globe className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{uniqueSessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{uniqueUsers}</p>
            <p className="text-xs text-muted-foreground">Unique Users</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-center">
            <MapPin className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{Object.keys(countryCounts).length}</p>
            <p className="text-xs text-muted-foreground">Countries</p>
          </div>
        </div>

        {/* Device Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Devices</h3>
          <div className="flex gap-3">
            {Object.entries(deviceCounts).map(([device, count]) => {
              const Icon = DEVICE_ICONS[device] || Monitor;
              const pct = totalVisits ? Math.round((count / totalVisits) * 100) : 0;
              return (
                <div key={device} className="flex-1 rounded-lg border border-border bg-background p-3 text-center">
                  <Icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{pct}%</p>
                  <p className="text-xs text-muted-foreground capitalize">{device}</p>
                  <p className="text-[10px] text-muted-foreground">{count} visits</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Pages */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Top Pages</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Page</TableHead>
                    <TableHead className="text-xs text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map(([page, count]) => (
                    <TableRow key={page}>
                      <TableCell className="text-xs font-mono truncate max-w-[180px]">{page}</TableCell>
                      <TableCell className="text-xs text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                  {topPages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">No data yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Top Countries */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Top Countries</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Country</TableHead>
                    <TableHead className="text-xs text-right">Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCountries.map(([country, count]) => (
                    <TableRow key={country}>
                      <TableCell className="text-xs">{country}</TableCell>
                      <TableCell className="text-xs text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                  {topCountries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">No data yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Browser & OS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Browsers</h3>
            <div className="space-y-1.5">
              {topBrowsers.map(([name, count]) => {
                const pct = totalVisits ? Math.round((count / totalVisits) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 truncate">{name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Operating Systems</h3>
            <div className="space-y-1.5">
              {topOS.map(([name, count]) => {
                const pct = totalVisits ? Math.round((count / totalVisits) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 truncate">{name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TrafficStatsSection;
