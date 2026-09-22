import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Search, FileArchive, Film, Tv } from "lucide-react";
import { format } from "date-fns";

export default function DownloadsManager() {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["download_logs"],
    queryFn: () => base44.entities.DownloadLog.list("-created_date", 5000),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        (l.user_email || "").toLowerCase().includes(q) ||
        (l.user_name || "").toLowerCase().includes(q) ||
        (l.content_title || "").toLowerCase().includes(q) ||
        (l.content_type || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  const totalDownloads = logs.length;
  const zipDownloads = logs.filter((l) => l.download_type === "zip").length;
  const singleDownloads = logs.filter((l) => l.download_type === "single").length;
  const totalBytes = logs.reduce((sum, l) => sum + (l.file_size_bytes || 0), 0);

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const typeIcon = (t) => {
    if (t === "series" || t === "franchise") return <Tv className="w-3.5 h-3.5" />;
    return <Film className="w-3.5 h-3.5" />;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Download className="w-5 h-5" /> User Download Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-foreground">{totalDownloads}</p>
            <p className="text-xs text-muted-foreground">Total Downloads</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-foreground">{singleDownloads}</p>
            <p className="text-xs text-muted-foreground">Single Files</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-foreground">{zipDownloads}</p>
            <p className="text-xs text-muted-foreground">ZIP Bundles</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-foreground">{formatSize(totalBytes)}</p>
            <p className="text-xs text-muted-foreground">Total Data Served</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, email, or content title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No downloads logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-semibold">User</th>
                  <th className="pb-2 pr-4 font-semibold">Content</th>
                  <th className="pb-2 pr-4 font-semibold">Type</th>
                  <th className="pb-2 pr-4 font-semibold">Items</th>
                  <th className="pb-2 pr-4 font-semibold">Size</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-2.5 pr-4">
                      <p className="font-semibold text-foreground text-xs truncate max-w-[140px]">
                        {log.user_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {log.user_email || ""}
                      </p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <p className="text-foreground text-xs truncate max-w-[200px]">
                        {log.content_title || "—"}
                      </p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={`text-xs gap-1 ${log.download_type === "zip" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`}
                      >
                        {log.download_type === "zip" ? <FileArchive className="w-3 h-3" /> : typeIcon(log.content_type)}
                        {log.download_type === "zip" ? "ZIP" : log.content_type}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                      {log.item_count || 1}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                      {formatSize(log.file_size_bytes)}
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {log.created_date
                        ? format(new Date(log.created_date), "d MMM yyyy, HH:mm")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}