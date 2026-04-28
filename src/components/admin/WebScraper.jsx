import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Upload, AlertTriangle, ImageIcon, Sparkles, Film, Tv } from "lucide-react";
import toast from "react-hot-toast";
import SeriesSearchSelect from "@/components/admin/SeriesSearchSelect";

export default function WebScraper({ seriesList, franchises, onSuccess }) {
  const [url, setUrl] = useState("");
  const [contentMode, setContentMode] = useState("tv"); // 'tv' or 'movies'
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [uploadingThumbFor, setUploadingThumbFor] = useState(null);
  const [fetchingAiFor, setFetchingAiFor] = useState(null);
  const [fetchingAiAll, setFetchingAiAll] = useState(false);

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    setItems([]);
    setScanMode(null);
    const res = await base44.functions.invoke("scrapeVideoLinks", { url });
    setScanning(false);
    if (res.data.error) { toast.error(res.data.error); return; }
    if (res.data.episodes.length === 0) { toast.error("No files or links found at that URL"); return; }
    setItems(res.data.episodes);
    setScanMode(res.data.mode);
    const msg = res.data.mode === "page_links"
      ? `Found ${res.data.total} links — URLs are download pages, not direct video files`
      : `Found ${res.data.total} file${res.data.total !== 1 ? "s" : ""}`;
    toast.success(msg);
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleThumbUpload = async (index, file) => {
    if (!file) return;
    setUploadingThumbFor(index);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateItem(index, "thumbnail_url", file_url);
    setUploadingThumbFor(null);
  };

  const handleAiFetch = async (index) => {
    const item = items[index];
    setFetchingAiFor(index);
    try {
      const type = contentMode === "tv" ? "episode" : "movie";
      const seriesName = contentMode === "tv"
        ? seriesList?.find(s => s.id === selectedSeries)?.title
        : undefined;
      const res = await base44.functions.invoke("aiMediaInfo", {
        title: item.title || "",
        type,
        seriesName,
        episodeNumber: item.episode_number,
      });
      if (res.data?.title || res.data?.description) {
        if (res.data.title) updateItem(index, "title", res.data.title);
        if (res.data.description) updateItem(index, "description", res.data.description);
        toast.success("AI info applied!");
      } else {
        toast.error("Couldn't find info for that title");
      }
    } catch (e) {
      toast.error("AI info failed");
    }
    setFetchingAiFor(null);
  };

  const handleAiFetchAll = async () => {
    setFetchingAiAll(true);
    const type = contentMode === "tv" ? "episode" : "movie";
    const seriesName = contentMode === "tv"
      ? seriesList?.find(s => s.id === selectedSeries)?.title
      : undefined;

    // Run all requests in parallel
    const results = await Promise.allSettled(
      items.map((item, i) =>
        base44.functions.invoke("aiMediaInfo", {
          title: item.title || "",
          type,
          seriesName,
          episodeNumber: item.episode_number,
        }).then(res => ({ index: i, data: res.data }))
      )
    );

    setItems(prev => {
      const updated = [...prev];
      results.forEach(result => {
        if (result.status === "fulfilled" && result.value?.data) {
          const { index, data } = result.value;
          updated[index] = {
            ...updated[index],
            ...(data.title ? { title: data.title } : {}),
            ...(data.description ? { description: data.description } : {}),
          };
        }
      });
      return updated;
    });

    setFetchingAiAll(false);
    toast.success("AI info applied to all items!");
  };

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleImport = async () => {
    if (contentMode === "tv" && !selectedSeries) { toast.error("Select a series first"); return; }
    if (items.length === 0) { toast.error("No items to import"); return; }
    setSaving(true);

    let records;
    if (contentMode === "tv") {
      const seriesCover = seriesList?.find(s => s.id === selectedSeries)?.cover_image;
      records = items.map(item => ({
        title: item.title,
        description: item.description || undefined,
        video_url: item.video_url,
        thumbnail_url: item.thumbnail_url || seriesCover || undefined,
        series_id: selectedSeries,
        episode_number: item.episode_number,
        content_type: "episode",
        is_featured: false,
      }));
    } else {
      records = items.map(item => ({
        title: item.title,
        description: item.description || undefined,
        video_url: item.video_url,
        thumbnail_url: item.thumbnail_url || undefined,
        franchise_id: selectedFranchise || undefined,
        content_type: "movie",
        is_featured: false,
      }));
    }

    await base44.entities.Video.bulkCreate(records);
    toast.success(`Imported ${records.length} ${contentMode === "tv" ? "episode" : "movie"}${records.length !== 1 ? "s" : ""}!`);
    setItems([]);
    setUrl("");
    setSelectedSeries("");
    setSelectedFranchise("");
    setSaving(false);
    onSuccess?.();
  };

  const isTV = contentMode === "tv";

  return (
    <div className="space-y-6">
      {/* Content Type Toggle */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setContentMode("tv")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              isTV ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tv className="w-4 h-4" /> TV Shows / Episodes
          </button>
          <button
            type="button"
            onClick={() => setContentMode("movies")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !isTV ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="w-4 h-4" /> Movies
          </button>
        </div>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label>Directory URL</Label>
        <p className="text-xs text-muted-foreground">Enter a directory URL with direct video files, or a show page with episode links</p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/videos/"
            className="bg-secondary border-border flex-1"
            onKeyDown={e => e.key === "Enter" && handleScan()}
          />
          <Button type="button" onClick={handleScan} disabled={scanning} className="gap-2 shrink-0">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <>
          {/* Assignment */}
          {isTV ? (
            <SeriesSearchSelect
              seriesList={seriesList}
              value={selectedSeries}
              onChange={setSelectedSeries}
              label="Assign to Series"
              required
            />
          ) : (
            <div className="space-y-2">
              <Label>Assign to Franchise (optional)</Label>
              <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="No franchise (standalone)" />
                </SelectTrigger>
                <SelectContent>
                  {franchises?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scanMode === "page_links" && (
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>These are <strong>download page links</strong>, not direct video files. Items will be imported but you'll need to edit each video URL to a direct file link before they can play.</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Found {items.length} {isTV ? "episode" : "movie"}{items.length !== 1 ? "s" : ""} — review &amp; edit before importing</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAiFetchAll}
                disabled={fetchingAiAll}
                className="gap-1.5 text-xs shrink-0"
              >
                {fetchingAiAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {fetchingAiAll ? "Fetching..." : "AI Fill All"}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {items.map((item, index) => (
                <div key={index} className="bg-secondary/50 border border-border rounded-lg px-3 py-2 flex gap-3">
                  {isTV && (
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center pt-1.5">{item.episode_number}</span>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Input
                        value={item.title}
                        onChange={e => updateItem(index, "title", e.target.value)}
                        placeholder={isTV ? "Episode title" : "Movie title"}
                        className="bg-secondary border-border h-7 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-primary hover:text-primary/80"
                        title="AI Auto-Fill title & description"
                        disabled={fetchingAiFor === index}
                        onClick={() => handleAiFetch(index)}
                      >
                        {fetchingAiFor === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      </Button>
                    </div>
                    <Input
                      value={item.description || ""}
                      onChange={e => updateItem(index, "description", e.target.value)}
                      placeholder="Description (optional)"
                      className="bg-secondary border-border h-7 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.thumbnail_url || ""}
                        onChange={e => updateItem(index, "thumbnail_url", e.target.value)}
                        placeholder="Thumbnail URL (optional)"
                        className="bg-secondary border-border h-7 text-sm flex-1"
                      />
                      <Button type="button" variant="secondary" className="relative overflow-hidden h-7 w-7 p-0 shrink-0" disabled={uploadingThumbFor === index} title="Upload thumbnail">
                        {uploadingThumbFor === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                        <input type="file" accept="image/*" onChange={e => handleThumbUpload(index, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </Button>
                      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-7 w-12 rounded object-cover shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.video_url}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {isTV && (
                      <Input
                        type="number"
                        value={item.episode_number}
                        onChange={e => updateItem(index, "episode_number", Number(e.target.value))}
                        className="bg-secondary border-border h-7 text-sm w-16"
                      />
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(index)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleImport} disabled={saving} className="w-full bg-primary hover:bg-primary/90 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {items.length} {isTV ? "Episode" : "Movie"}{items.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}