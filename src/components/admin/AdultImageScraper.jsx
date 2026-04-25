import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Upload, AlertTriangle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultImageScraper({ adultSeriesList, onSuccess }) {
  const [url, setUrl] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [scanning, setScanning] = useState(false);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [massBaseName, setMassBaseName] = useState("");
  const [massStartNum, setMassStartNum] = useState(1);
  const [saveProgress, setSaveProgress] = useState(null);

  const handleScan = async () => {
    if (!url) { toast.error("Enter a URL to scan"); return; }
    setScanning(true);
    setImages([]);
    const res = await base44.functions.invoke("scrapeImageLinks", { url });
    setScanning(false);
    if (res.data.error) { toast.error(res.data.error); return; }
    if (res.data.images.length === 0) { toast.error("No image files found"); return; }
    setImages(res.data.images);
    toast.success(`Found ${res.data.images.length} image${res.data.images.length !== 1 ? "s" : ""}`);
  };

  const updateImg = (index, field, value) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, [field]: value } : img));
  };

  const removeImg = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  const applyMassRename = () => {
    if (!massBaseName.trim()) { toast.error("Enter a base name"); return; }
    setImages(prev => prev.map((img, i) => ({ ...img, title: `${massBaseName.trim()} ${massStartNum + i}` })));
    toast.success(`Renamed ${images.length} items`);
  };

  const handleImport = async () => {
    if (!selectedSeries) { toast.error("Select a series"); return; }
    if (images.length === 0) { toast.error("No images to import"); return; }
    setSaving(true);
    setSaveProgress(0);

    const records = images.map((img, idx) => ({
      title: img.title || `Image ${idx + 1}`,
      image_url: img.image_url,
      series_id: selectedSeries,
      is_adult: true,
      sort_order: idx,
    }));

    // Chunk into batches of 100 to safely handle 500+ items
    const CHUNK = 100;
    let done = 0;
    for (let i = 0; i < records.length; i += CHUNK) {
      await base44.entities.Image.bulkCreate(records.slice(i, i + CHUNK));
      done += Math.min(CHUNK, records.length - i);
      setSaveProgress(Math.round((done / records.length) * 100));
    }

    toast.success(`Imported ${records.length} image${records.length !== 1 ? "s" : ""}!`);
    setImages([]);
    setUrl("");
    setSelectedSeries("");
    setSaving(false);
    setSaveProgress(null);
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Series *</Label>
        <Select value={selectedSeries} onValueChange={setSelectedSeries}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select series to add images to" />
          </SelectTrigger>
          <SelectContent>
            {adultSeriesList?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Directory URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/images/"
            className="bg-secondary border-border flex-1"
            onKeyDown={e => e.key === "Enter" && handleScan()}
          />
          <Button type="button" onClick={handleScan} disabled={scanning} className="gap-2 shrink-0 bg-red-600 hover:bg-red-700">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan Images
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <>
          {/* Mass Rename */}
          <div className="bg-secondary/60 border border-border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mass Rename All</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={massBaseName}
                onChange={e => setMassBaseName(e.target.value)}
                placeholder="Base name (e.g. Photo)"
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
            <Label>Found {images.length} image{images.length !== 1 ? "s" : ""}</Label>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {images.map((img, index) => (
                <div key={index} className="bg-secondary/50 border border-red-500/20 rounded-lg px-3 py-2 flex gap-3">
                  {img.image_url && <img src={img.image_url} alt="" className="h-16 w-16 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input value={img.title || ""} onChange={e => updateImg(index, "title", e.target.value)} placeholder="Title (optional)" className="bg-secondary border-border h-7 text-sm" />
                    <p className="text-xs text-muted-foreground truncate">{img.image_url}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => removeImg(index)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {saveProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing...</span><span>{saveProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${saveProgress}%` }} />
              </div>
            </div>
          )}
          <Button onClick={handleImport} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {images.length} Image{images.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}