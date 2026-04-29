import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Trash2, ImageIcon, Film, Tv, Save } from "lucide-react";
import toast from "react-hot-toast";
import SeriesSearchSelect from "@/components/admin/SeriesSearchSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImageScraper({ seriesList, videos, franchises, onSuccess }) {
  const [contentMode, setContentMode] = useState("tv"); // 'tv' or 'movies'
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [saving, setSaving] = useState(false);

  // For TV: list of episodes in the selected series with their current thumbnail
  const seriesVideos = selectedSeries
    ? videos.filter((v) => v.series_id === selectedSeries).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
    : [];

  // For movies: list of movies in the selected franchise (or all standalone movies)
  const franchiseMovies = videos.filter((v) => {
    if (v.series_id) return false;
    if (selectedFranchise) return v.franchise_id === selectedFranchise;
    return v.content_type === "movie";
  });

  // Per-item overrides
  const [overrides, setOverrides] = useState({});

  const setOverride = (id, url) => setOverrides((prev) => ({ ...prev, [id]: url }));

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    try {
      const res = await base44.functions.invoke("scrapeImageLinks", { url });
      if (res.data?.error) { toast.error(res.data.error); setScanning(false); return; }
      const imgs = res.data?.images || [];
      if (imgs.length === 0) { toast.error("No images found at that URL"); setScanning(false); return; }
      // images may be objects {image_url} or plain strings
      const firstUrl = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.image_url;
      setImageUrl(firstUrl || "");
      toast.success(`Found ${imgs.length} image${imgs.length !== 1 ? "s" : ""}. First one set as default.`);
    } catch (e) {
      toast.error("Scan failed");
    }
    setScanning(false);
  };

  const handleApplyAll = async () => {
    const targets = contentMode === "tv" ? seriesVideos : franchiseMovies;
    if (targets.length === 0) { toast.error("No videos to update"); return; }
    if (!imageUrl) { toast.error("Enter an image URL first"); return; }
    setSaving(true);
    try {
      await Promise.all(
        targets.map((v) =>
          base44.entities.Video.update(v.id, { thumbnail_url: overrides[v.id] || imageUrl })
        )
      );
      toast.success(`Updated ${targets.length} thumbnail${targets.length !== 1 ? "s" : ""}!`);
      setOverrides({});
      onSuccess?.();
    } catch (e) {
      toast.error("Failed to update some thumbnails");
    }
    setSaving(false);
  };

  const handleApplySingle = async (v) => {
    const thumb = overrides[v.id] || imageUrl;
    if (!thumb) { toast.error("Enter an image URL first"); return; }
    await base44.entities.Video.update(v.id, { thumbnail_url: thumb });
    toast.success("Updated!");
    onSuccess?.();
  };

  const isTV = contentMode === "tv";
  const targets = isTV ? seriesVideos : franchiseMovies;

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setContentMode("tv"); setOverrides({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              isTV ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tv className="w-4 h-4" /> TV Episodes
          </button>
          <button
            type="button"
            onClick={() => { setContentMode("movies"); setOverrides({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !isTV ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="w-4 h-4" /> Movies
          </button>
        </div>
      </div>

      {/* Series / Franchise picker */}
      {isTV ? (
        <SeriesSearchSelect
          seriesList={seriesList}
          value={selectedSeries}
          onChange={(v) => { setSelectedSeries(v); setOverrides({}); }}
          label="Select Series"
        />
      ) : (
        <div className="space-y-2">
          <Label>Franchise (optional — leave blank for all standalone movies)</Label>
          <Select value={selectedFranchise} onValueChange={(v) => { setSelectedFranchise(v); setOverrides({}); }}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="All standalone movies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All standalone movies</SelectItem>
              {franchises?.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Image URL / Scan */}
      <div className="space-y-2">
        <Label>Default Image URL</Label>
        <p className="text-xs text-muted-foreground">Paste a direct image URL, or scan a directory to auto-detect images</p>
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/images/poster.jpg"
            className="bg-secondary border-border flex-1"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Scan directory URL for images..."
            className="bg-secondary border-border flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button type="button" onClick={handleScan} disabled={scanning} className="gap-2 shrink-0">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </Button>
        </div>
      </div>

      {/* Episode / Movie list */}
      {targets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{targets.length} {isTV ? "episode" : "movie"}{targets.length !== 1 ? "s" : ""} — apply image to all or override per item</Label>
            <Button
              onClick={handleApplyAll}
              disabled={saving || !imageUrl}
              size="sm"
              className="gap-2 shrink-0"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Apply All
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {targets.map((v) => {
              const thumb = overrides[v.id] !== undefined ? overrides[v.id] : (imageUrl || v.thumbnail_url || "");
              return (
                <div key={v.id} className="bg-secondary/60 border border-border rounded-lg p-3 flex items-center gap-3">
                  <div className="w-16 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{v.title}</p>
                    {v.episode_number && <p className="text-xs text-muted-foreground">Episode {v.episode_number}</p>}
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <Input
                      value={overrides[v.id] !== undefined ? overrides[v.id] : ""}
                      onChange={(e) => setOverride(v.id, e.target.value)}
                      placeholder="Override URL..."
                      className="bg-secondary border-border h-7 text-xs w-40"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary/80 shrink-0"
                      title="Save this item"
                      onClick={() => handleApplySingle(v)}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                    {overrides[v.id] !== undefined && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground shrink-0"
                        onClick={() => setOverride(v.id, undefined)}
                        title="Clear override"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isTV && selectedSeries && seriesVideos.length === 0) && (
        <p className="text-sm text-muted-foreground">No episodes found in this series.</p>
      )}
    </div>
  );
}