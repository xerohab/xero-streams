import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Replace, CheckCircle2, AlertCircle } from "lucide-react";

export default function MassLinkUpdater({ videos, seriesList, franchises, onSuccess }) {
  const [targetType, setTargetType] = useState("episode_video");
  const [scope, setScope] = useState("all"); // "all" | "series" | "franchise"
  const [selectedId, setSelectedId] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const targetOptions = [
    { value: "episode_video", label: "TV Links (Episode URLs)" },
    { value: "movie_video", label: "Movie Links (Movie URLs)" },
    { value: "video_thumbnail", label: "Video Thumbnails" },
    { value: "video_download", label: "Video Download URLs" },
    { value: "series_cover", label: "Series Covers" },
    { value: "franchise_cover", label: "Franchise Covers" },
    { value: "gallery_image", label: "Image Gallery Links" },
  ];

  const getTargetEntities = async () => {
    if (["episode_video", "movie_video", "video_thumbnail", "video_download"].includes(targetType)) {
      let targets = videos;
      if (scope === "series") targets = videos.filter((v) => v.series_id === selectedId);
      if (scope === "franchise") {
        const seriesInFranchise = seriesList.filter((s) => s.franchise_id === selectedId).map((s) => s.id);
        targets = videos.filter(
          (v) => v.franchise_id === selectedId || seriesInFranchise.includes(v.series_id)
        );
      }
      
      if (targetType === "episode_video") return targets.filter(v => v.content_type === "episode" || !v.content_type);
      if (targetType === "movie_video") return targets.filter(v => v.content_type === "movie");
      return targets; // thumbnail or download
    }
    
    if (targetType === "series_cover") {
      if (scope === "all") return seriesList;
      if (scope === "series") return seriesList.filter(s => s.id === selectedId);
      if (scope === "franchise") return seriesList.filter(s => s.franchise_id === selectedId);
    }
    
    if (targetType === "franchise_cover") {
      if (scope === "all") return franchises;
      if (scope === "franchise") return franchises.filter(f => f.id === selectedId);
      return [];
    }

    if (targetType === "gallery_image") {
      const allImages = await base44.entities.Image.list();
      if (scope === "all") return allImages;
      if (scope === "series") return allImages.filter(img => img.series_id === selectedId);
      if (scope === "franchise") {
        const seriesInFranchise = seriesList.filter((s) => s.franchise_id === selectedId).map((s) => s.id);
        return allImages.filter(img => seriesInFranchise.includes(img.series_id));
      }
    }
    
    return [];
  };

  const getFieldForTarget = () => {
    if (targetType === "episode_video" || targetType === "movie_video") return "video_url";
    if (targetType === "video_thumbnail") return "thumbnail_url";
    if (targetType === "video_download") return "download_url";
    if (targetType === "series_cover" || targetType === "franchise_cover") return "cover_image";
    if (targetType === "gallery_image") return "image_url";
    return "video_url";
  };

  const getEntityNameForTarget = () => {
    if (["episode_video", "movie_video", "video_thumbnail", "video_download"].includes(targetType)) return "Video";
    if (targetType === "series_cover") return "Series";
    if (targetType === "franchise_cover") return "Franchise";
    if (targetType === "gallery_image") return "Image";
    return "Video";
  };

  const handlePreview = async () => {
    if (!findText.trim()) return;
    setResult(null);
    setLoading(true);
    try {
      const targets = await getTargetEntities();
      const field = getFieldForTarget();
      const entityName = getEntityNameForTarget();
      
      const affected = targets.filter((v) => v[field] && v[field].includes(findText));
      setPreview(
        affected.map((v) => ({
          id: v.id,
          title: v.title || v.name || "Untitled",
          old: v[field],
          new: v[field].replaceAll(findText, replaceText),
          entityName,
          field
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    setResult(null);

    const chunkSize = 5;
    let updated = 0;
    for (let i = 0; i < preview.length; i += chunkSize) {
      const chunk = preview.slice(i, i + chunkSize);
      await Promise.all(chunk.map((item) => {
        return base44.entities[item.entityName].update(item.id, { [item.field]: item.new });
      }));
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
    { value: "all", label: "All Items" },
    { value: "series", label: "By Series" },
    { value: "franchise", label: "By Franchise" },
  ];

  return (
    <div className="space-y-6">
      {/* Target Type selector */}
      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">Target Link Type</p>
        <select
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setPreview(null); setResult(null); }}
          className="w-full md:w-auto bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
        >
          {targetOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

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
          <p className="text-sm text-muted-foreground mb-1.5 font-medium">Find (in links)</p>
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
          <span className="text-sm font-medium">Updated {result.updated} link{result.updated !== 1 ? "s" : ""} successfully.</span>
        </div>
      )}

      {/* Preview table */}
      {preview !== null && (
        <div className="space-y-4">
          {preview.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">No links contain "<strong>{findText}</strong>" in the selected scope and target.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Badge className="mr-2 bg-primary/20 text-primary">{preview.length}</Badge>
                  item{preview.length !== 1 ? "s" : ""} will be updated
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