import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const CsvViewerPage = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [chartType, setChartType] = useState("bar");
  const [xCol, setXCol] = useState("0");
  const [yCol, setYCol] = useState("1");
  const navigate = useNavigate();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const sep = lines[0].includes("\t") ? "\t" : ",";
      const h = lines[0].split(sep).map(s => s.replace(/^"|"$/g, "").trim());
      const r = lines.slice(1).map(l => l.split(sep).map(s => s.replace(/^"|"$/g, "").trim()));
      setHeaders(h); setRows(r);
      setXCol("0"); setYCol(h.length > 1 ? "1" : "0");
    };
    reader.readAsText(f);
  };

  const chartData = useMemo(() => {
    const xi = parseInt(xCol); const yi = parseInt(yCol);
    return rows.slice(0, 50).map(r => ({ name: r[xi] || "", value: parseFloat(r[yi]) || 0 }));
  }, [rows, xCol, yCol]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-bold text-foreground mb-6">CSV/Excel Viewer & Chart Maker</h1>

        <label className="flex items-center gap-2 cursor-pointer p-4 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/50 transition-colors mb-6">
          <Upload className="h-5 w-5 text-primary" />
          <span className="text-foreground">Upload CSV or TSV file</span>
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
        </label>

        {headers.length > 0 && (
          <>
            <div className="rounded-xl border border-border bg-card overflow-auto mb-6 max-h-[300px]">
              <Table>
                <TableHeader><TableRow>{headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="text-xs">{c}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Chart</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={xCol} onValueChange={setXCol}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>X: {h}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={yCol} onValueChange={setYCol}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>Y: {h}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "pie" ? (
                    <PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /></PieChart>
                  ) : chartType === "line" ? (
                    <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" /></LineChart>
                  ) : (
                    <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CsvViewerPage;
