import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Upload, AlertTriangle, ImageIcon, Sparkles, Film, Tv, Globe, X } from "lucide-react";
import toast from "react-hot-toast";
import SeriesSearchSelect from "@/components/admin/SeriesSearchSelect";
import { detectVideoQuality } from "@/lib/qualityDetection";

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
  const [imageScrapeFor, setImageScrapeFor] = useState(null); // index of item with scraper open
  const [imageScrapeUrl, setImageScrapeUrl] = useState("");
  const [scrapedImages, setScrapedImages] = useState([]);
  const [scrapingImages, setScrapingImages] = useState(false);

  const handleScrapeImages = async () => {
    if (!imageScrapeUrl) return;
    setScrapingImages(true);
    setScrapedImages([]);
    try {
      const res = await base44.functions.invoke("scrapeImageLinks", { url: imageScrapeUrl });
      if (res.data?.images?.length > 0) {
        setScrapedImages(res.data.images.map(img => typeof img === "object" ? img.image_url : img));
        toast.success(`Found ${res.data.images.length} images`);
      } else {
        toast.error("No images found at that URL");
      }
    } catch (e) {
      toast.error("Failed to scrape images");
    }
    setScrapingImages(false);
  };

  const pickScrapedImage = (index, url) => {
    updateItem(index, "thumbnail_url", url);
    setImageScrapeFor(null);
    setImageScrapeUrl("");
    setScrapedImages([]);
  };

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    setItems([]);
    setScanMode(null);
    const res = await base44.functions.invoke("scrapeVideoLinks", { url });
    setScanning(false);
    if (res.data.error) { toast.error(res.data.error); return; }
    if (res.data.episodes.length === 0) { toast.error("No files or links found at that URL"); return; }
    setItems(res.data.episodes.map(ep => ({ ...ep, episode_number: contentMode === "tv" ? ep.episode_number : "", quality: "Unknown", quality_notes: "" })));
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
    const toastId = toast.loading("Processing & auto-detecting qualities...");

    let records = [];
    const seriesCover = contentMode === "tv" ? seriesList?.find(s => s.id === selectedSeries)?.cover_image : undefined;

    for (const item of items) {
      let finalQuality = item.quality || "Unknown";
      if (finalQuality === "Unknown" && item.video_url && scanMode !== "page_links") {
        // Only auto-detect if we have a direct video link, page links won't work in video elements
        finalQuality = await detectVideoQuality(item.video_url, item.title);
      }

      records.push({
      title: item.title,
      description: item.description || undefined,
      video_url: item.video_url,
      thumbnail_url: item.thumbnail_url || seriesCover || undefined,
      series_id: contentMode === "tv" ? selectedSeries : undefined,
      franchise_id: contentMode !== "tv" ? selectedFranchise || undefined : undefined,
      episode_number: item.episode_number || undefined,
      content_type: contentMode === "tv" ? "episode" : "movie",
        is_featured: false,
        quality: finalQuality,
        quality_notes: item.quality_notes || undefined,
      });
    }

    await base44.entities.Video.bulkCreate(records);
    toast.success(`Imported ${records.length} ${contentMode === "tv" ? "episode" : "movie"}${records.length !== 1 ? "s" : ""}!`, { id: toastId });
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
            onClick={() => {
              setContentMode("movies");
              setItems(prev => prev.map(item => ({ ...item, episode_number: "" })));
            }}
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
                  <span className="text-xs font-mono text-muted-foreground w-6 text-center pt-1.5">
                    {item.episode_number || "-"}
                  </span>
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
                      <Button type="button" variant="secondary" className="h-7 w-7 p-0 shrink-0" title="Scrape images from URL" onClick={() => { setImageScrapeFor(index); setScrapedImages([]); setImageScrapeUrl(""); }}>
                        <Globe className="w-3 h-3" />
                      </Button>
                      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="h-7 w-12 rounded object-cover shrink-0" />}
                    </div>
                    {imageScrapeFor === index && (
                      <div className="bg-background border border-border rounded-lg p-2 space-y-2">
                        <div className="flex items-center gap-1">
                          <Input
                            value={imageScrapeUrl}
                            onChange={e => setImageScrapeUrl(e.target.value)}
                            placeholder="URL to scrape images from"
                            className="bg-secondary border-border h-7 text-xs flex-1"
                            onKeyDown={e => e.key === "Enter" && handleScrapeImages()}
                          />
                          <Button type="button" size="sm" className="h-7 text-xs px-2" onClick={handleScrapeImages} disabled={scrapingImages}>
                            {scrapingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setImageScrapeFor(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {scrapedImages.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                            {scrapedImages.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={imgUrl}
                                alt=""
                                className="h-14 w-20 object-cover rounded cursor-pointer border-2 border-transparent hover:border-primary transition-all"
                                onClick={() => pickScrapedImage(index, imgUrl)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">{item.video_url}</p>
                      <Input
                        value={item.quality_notes || ""}
                        onChange={e => updateItem(index, "quality_notes", e.target.value)}
                        placeholder="Quality notes (e.g. HC subs)"
                        className="w-32 bg-secondary border-border h-6 text-xs"
                      />
                      <Select value={item.quality || "Unknown"} onValueChange={(v) => updateItem(index, "quality", v)}>
                        <SelectTrigger className="w-28 bg-secondary border-border h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unknown">Auto Quality</SelectItem>
                          <SelectItem value="4K">4K</SelectItem>
                          <SelectItem value="Full HD">Full HD</SelectItem>
                          <SelectItem value="HD">HD</SelectItem>
                          <SelectItem value="CAM">CAM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Input
                      type="number"
                      value={item.episode_number || ""}
                      onChange={e => updateItem(index, "episode_number", Number(e.target.value))}
                      placeholder="Ep #"
                      className="bg-secondary border-border h-7 text-sm w-16"
                    />
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