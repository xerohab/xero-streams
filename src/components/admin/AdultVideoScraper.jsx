import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Trash2, Upload, AlertTriangle, ImageIcon, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultVideoScraper({ adultSeriesList, onSuccess }) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [uploadingThumbFor, setUploadingThumbFor] = useState(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [massBaseName, setMassBaseName] = useState("");
  const [massStartNum, setMassStartNum] = useState(1);

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    setEpisodes([]);
    setScanMode(null);
    const res = await base44.functions.invoke("scrapeVideoLinks", { url });
    setScanning(false);
    if (res.data.error) { toast.error(res.data.error); return; }
    if (res.data.episodes.length === 0) { toast.error("No video files found"); return; }
    setEpisodes(res.data.episodes);
    setScanMode(res.data.mode);
    toast.success(`Found ${res.data.total} video${res.data.total !== 1 ? "s" : ""}`);
  };

  const updateEp = (index, field, value) => {
    setEpisodes(prev => prev.map((ep, i) => i === index ? { ...ep, [field]: value } : ep));
  };

  const handleThumbUpload = async (index, file) => {
    if (!file) return;
    setUploadingThumbFor(index);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateEp(index, "thumbnail_url", file_url);
    setUploadingThumbFor(null);
  };

  const removeEp = (index) => setEpisodes(prev => prev.filter((_, i) => i !== index));

  const applyMassRename = () => {
    if (!massBaseName.trim()) { toast.error("Enter a base name"); return; }
    setEpisodes(prev => prev.map((ep, i) => ({ ...ep, title: `${massBaseName.trim()} ${massStartNum + i}` })));
    toast.success(`Renamed ${episodes.length} items`);
  };

  const handleImport = async () => {
    if (episodes.length === 0) { toast.error("No items to import"); return; }
    setSaving(true);

    const records = episodes.map(ep => ({
      title: ep.title,
      description: ep.description || undefined,
      video_url: ep.video_url,
      thumbnail_url: ep.thumbnail_url || undefined,
      content_type: selectedSeriesId ? "episode" : "movie",
      series_id: selectedSeriesId || undefined,
      is_adult: true,
      is_featured: false,
    }));

    // Chunk into batches of 100 to safely handle 500+ items
    const CHUNK = 100;
    for (let i = 0; i < records.length; i += CHUNK) {
      await base44.entities.Video.bulkCreate(records.slice(i, i + CHUNK));
    }
    toast.success(`Imported ${records.length} video${records.length !== 1 ? "s" : ""}!`);
    setEpisodes([]);
    setUrl("");
    setSelectedSeriesId("");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <Label>Series (optional)</Label>
        <select
          value={selectedSeriesId}
          onChange={e => setSelectedSeriesId(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
        >
          <option value="">No series (standalone videos)</option>
          {adultSeriesList.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Directory URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/videos/"
            className="bg-secondary border-border flex-1"
            onKeyDown={e => e.key === "Enter" && handleScan()}
          />
          <Button type="button" onClick={handleScan} disabled={scanning} className="gap-2 shrink-0 bg-red-600 hover:bg-red-700">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan Videos
          </Button>
        </div>
      </div>

      {episodes.length > 0 && (
        <>
          {scanMode === 'page_links' && (
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>These are download page links, not direct video files. Edit URLs before importing.</span>
            </div>
          )}

          {/* Mass Rename */}
          <div className="bg-secondary/60 border border-border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mass Rename All</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={massBaseName}
                onChange={e => setMassBaseName(e.target.value)}
                placeholder="Base name (e.g. Video)"
                className="bg-secondary border-border h-8 text-sm flex-1 min-w-32"
              />
              <Input
                type="number"
                value={massStartNum}
                onChange={e => setMassStartNum(Number(e.target.value))}
                placeholder="Start #"
                className="bg-secondary border-border h-8 text-sm w-20"
                min={0}
              />
              <Button type="button" onClick={applyMassRename} size="sm" variant="outline" className="gap-1.5 h-8 shrink-0">
                <RefreshCw className="w-3 h-3" /> Apply to All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Renames all items as "Base name 1", "Base name 2", etc.</p>
          </div>

          <div className="space-y-2">
            <Label>Found {episodes.length} video{episodes.length !== 1 ? "s" : ""}</Label>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {episodes.map((ep, index) => (
                <div key={index} className="bg-secondary/50 border border-red-500/20 rounded-lg px-3 py-2 flex gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input value={ep.title} onChange={e => updateEp(index, "title", e.target.value)} placeholder="Title" className="bg-secondary border-border h-7 text-sm" />
                    <Input value={ep.description || ""} onChange={e => updateEp(index, "description", e.target.value)} placeholder="Description (optional)" className="bg-secondary border-border h-7 text-sm" />
                    <div className="flex items-center gap-2">
                      <Input value={ep.thumbnail_url || ""} onChange={e => updateEp(index, "thumbnail_url", e.target.value)} placeholder="Thumbnail URL" className="bg-secondary border-border h-7 text-sm flex-1" />
                      <Button type="button" variant="secondary" className="relative overflow-hidden h-7 w-7 p-0 shrink-0" disabled={uploadingThumbFor === index}>
                        {uploadingThumbFor === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                        <input type="file" accept="image/*" onChange={e => handleThumbUpload(index, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </Button>
                      {ep.thumbnail_url && <img src={ep.thumbnail_url} alt="" className="h-7 w-12 rounded object-cover shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ep.video_url}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => removeEp(index)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleImport} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {episodes.length} Video{episodes.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}