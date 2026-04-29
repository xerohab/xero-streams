import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Replace, CheckCircle2, AlertCircle } from "lucide-react";

export default function MassLinkUpdater({ videos, seriesList, franchises, onSuccess }) {
  const [scope, setScope] = useState("all"); // "all" | "series" | "franchise"
  const [selectedId, setSelectedId] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const getTargetVideos = () => {
    if (scope === "all") return videos;
    if (scope === "series") return videos.filter((v) => v.series_id === selectedId);
    if (scope === "franchise") {
      const seriesInFranchise = seriesList.filter((s) => s.franchise_id === selectedId).map((s) => s.id);
      return videos.filter(
        (v) => v.franchise_id === selectedId || seriesInFranchise.includes(v.series_id)
      );
    }
    return [];
  };

  const handlePreview = () => {
    if (!findText.trim()) return;
    setResult(null);
    const targets = getTargetVideos();
    const affected = targets.filter((v) => v.video_url && v.video_url.includes(findText));
    setPreview(
      affected.map((v) => ({
        id: v.id,
        title: v.title,
        old: v.video_url,
        new: v.video_url.replaceAll(findText, replaceText),
      }))
    );
  };

  const handleApply = async () => {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    setResult(null);

    // Process in chunks of 5 with a 500ms pause between chunks to avoid rate limits
    const chunkSize = 5;
    let updated = 0;
    for (let i = 0; i < preview.length; i += chunkSize) {
      const chunk = preview.slice(i, i + chunkSize);
      await Promise.all(chunk.map((item) => base44.entities.Video.update(item.id, { video_url: item.new })));
      updated += chunk.length;
      if (i + chunkSize < preview.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setLoading(false);
    setPreview(null);
    setResult({ updated });
    if (onSuccess) onSuccess();
  };

  const scopeOptions = [
    { value: "all", label: "All Videos" },
    { value: "series", label: "By Series" },
    { value: "franchise", label: "By Franchise" },
  ];

  return (
    <div className="space-y-6">
      {/* Scope selector */}
      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">Scope</p>
        <div className="flex flex-wrap gap-2">
          {scopeOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => { setScope(o.value); setSelectedId(""); setPreview(null); setResult(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                scope === o.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Series / Franchise picker */}
      {scope === "series" && (
        <div>
          <p className="text-sm text-muted-foreground mb-2 font-medium">Select Series</p>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setPreview(null); setResult(null); }}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            <option value="">-- Choose a series --</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {scope === "franchise" && (
        <div>
          <p className="text-sm text-muted-foreground mb-2 font-medium">Select Franchise</p>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setPreview(null); setResult(null); }}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            <option value="">-- Choose a franchise --</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Find & Replace inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1.5 font-medium">Find (in video URLs)</p>
          <Input
            value={findText}
            onChange={(e) => { setFindText(e.target.value); setPreview(null); setResult(null); }}
            placeholder="e.g. vids.hab-lounge.com"
            className="bg-secondary border-border"
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1.5 font-medium">Replace with</p>
          <Input
            value={replaceText}
            onChange={(e) => { setReplaceText(e.target.value); setPreview(null); setResult(null); }}
            placeholder="e.g. vids2.hab-lounge.com"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      <Button
        onClick={handlePreview}
        disabled={!findText.trim() || (scope !== "all" && !selectedId)}
        variant="outline"
        className="gap-2"
      >
        <Search className="w-4 h-4" />
        Preview Changes
      </Button>

      {/* Result message */}
      {result && (
        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Updated {result.updated} video URL{result.updated !== 1 ? "s" : ""} successfully.</span>
        </div>
      )}

      {/* Preview table */}
      {preview !== null && (
        <div className="space-y-4">
          {preview.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">No video URLs contain "<strong>{findText}</strong>" in the selected scope.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Badge className="mr-2 bg-primary/20 text-primary">{preview.length}</Badge>
                  video{preview.length !== 1 ? "s" : ""} will be updated
                </p>
                <Button onClick={handleApply} disabled={loading} className="gap-2 bg-primary hover:bg-primary/90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Replace className="w-4 h-4" />}
                  Apply to All
                </Button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {preview.map((item) => (
                  <div key={item.id} className="bg-secondary rounded-lg p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground text-sm">{item.title}</p>
                    <p className="text-red-400 font-mono truncate">
                      <span className="text-muted-foreground mr-1">Before:</span>{item.old}
                    </p>
                    <p className="text-green-400 font-mono truncate">
                      <span className="text-muted-foreground mr-1">After:</span>{item.new}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}