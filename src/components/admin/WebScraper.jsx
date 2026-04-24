import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Upload, AlertTriangle, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function WebScraper({ seriesList, onSuccess }) {
  const [url, setUrl] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [scanning, setScanning] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState(null); // 'direct' or 'page_links'
  const [uploadingThumbFor, setUploadingThumbFor] = useState(null);

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    setEpisodes([]);
    setScanMode(null);
    const res = await base44.functions.invoke("scrapeVideoLinks", { url });
    setScanning(false);
    if (res.data.error) { toast.error(res.data.error); return; }
    if (res.data.episodes.length === 0) { toast.error("No files or episode links found at that URL"); return; }
    setEpisodes(res.data.episodes);
    setScanMode(res.data.mode);
    const msg = res.data.mode === 'page_links'
      ? `Found ${res.data.total} episode links — URLs are download pages, not direct video files`
      : `Found ${res.data.total} file${res.data.total !== 1 ? "s" : ""}`;
    toast.success(msg);
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

  const handleImport = async () => {
    if (!selectedSeries) { toast.error("Select a series first"); return; }
    if (episodes.length === 0) { toast.error("No episodes to import"); return; }
    setSaving(true);

    const seriesCover = seriesList?.find(s => s.id === selectedSeries)?.cover_image;

    const records = episodes.map(ep => ({
      title: ep.title,
      description: ep.description || undefined,
      video_url: ep.video_url,
      thumbnail_url: ep.thumbnail_url || seriesCover || undefined,
      series_id: selectedSeries,
      episode_number: ep.episode_number,
      content_type: "episode",
      is_featured: false,
    }));

    await base44.entities.Video.bulkCreate(records);
    toast.success(`Imported ${records.length} episode${records.length !== 1 ? "s" : ""}!`);
    setEpisodes([]);
    setUrl("");
    setSelectedSeries("");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Directory URL</Label>
        <p className="text-xs text-muted-foreground">Enter a directory URL with direct video files, or a show page with episode links (e.g. naijaprey.tv)</p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://vids.hab-lounge.com/Orginals/s2/"
            className="bg-secondary border-border flex-1"
            onKeyDown={e => e.key === "Enter" && handleScan()}
          />
          <Button type="button" onClick={handleScan} disabled={scanning} className="gap-2 shrink-0">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </Button>
        </div>
      </div>

      {episodes.length > 0 && (
        <>
          <div className="space-y-2">
            <Label>Assign to Series *</Label>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a series" />
              </SelectTrigger>
              <SelectContent>
                {seriesList?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scanMode === 'page_links' && (
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>These are <strong>download page links</strong>, not direct video files. Episodes will be imported but you'll need to edit each video URL to a direct file link before they can play.</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Found {episodes.length} episode{episodes.length !== 1 ? "s" : ""} — review &amp; edit before importing</Label>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {episodes.map((ep, index) => (
                <div key={index} className="bg-secondary/50 border border-border rounded-lg px-3 py-2 flex gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-6 text-center pt-1.5">{ep.episode_number}</span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input
                      value={ep.title}
                      onChange={e => updateEp(index, "title", e.target.value)}
                      placeholder="Episode title"
                      className="bg-secondary border-border h-7 text-sm"
                    />
                    <Input
                      value={ep.description || ""}
                      onChange={e => updateEp(index, "description", e.target.value)}
                      placeholder="Description (optional)"
                      className="bg-secondary border-border h-7 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        value={ep.thumbnail_url || ""}
                        onChange={e => updateEp(index, "thumbnail_url", e.target.value)}
                        placeholder="Thumbnail URL (optional)"
                        className="bg-secondary border-border h-7 text-sm flex-1"
                      />
                      <Button type="button" variant="secondary" className="relative overflow-hidden h-7 w-7 p-0 shrink-0" disabled={uploadingThumbFor === index} title="Upload thumbnail">
                        {uploadingThumbFor === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                        <input type="file" accept="image/*" onChange={e => handleThumbUpload(index, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </Button>
                      {ep.thumbnail_url && <img src={ep.thumbnail_url} alt="" className="h-7 w-12 rounded object-cover shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ep.video_url}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Input
                      type="number"
                      value={ep.episode_number}
                      onChange={e => updateEp(index, "episode_number", Number(e.target.value))}
                      className="bg-secondary border-border h-7 text-sm w-16"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeEp(index)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleImport} disabled={saving} className="w-full bg-primary hover:bg-primary/90 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {episodes.length} Episode{episodes.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}