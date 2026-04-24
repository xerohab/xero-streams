import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Upload, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultImageScraper({ adultSeriesList, imageCategories, onSuccess }) {
  const [url, setUrl] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [contentType, setContentType] = useState("individual");
  const [scanning, setScanning] = useState(false);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

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

  const handleImport = async () => {
    if (!selectedCategory) { toast.error("Select a category"); return; }
    if (contentType === "series" && !selectedSeries) { toast.error("Select a series"); return; }
    if (images.length === 0) { toast.error("No images to import"); return; }
    setSaving(true);

    const records = images.map((img, idx) => ({
      title: img.title || `Image ${idx + 1}`,
      image_url: img.image_url,
      category_id: selectedCategory,
      series_id: contentType === "series" ? selectedSeries : undefined,
      is_adult: true,
      sort_order: idx,
    }));

    await base44.entities.Image.bulkCreate(records);
    toast.success(`Imported ${records.length} image${records.length !== 1 ? "s" : ""}!`);
    setImages([]);
    setUrl("");
    setSelectedCategory("");
    setSelectedSeries("");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="bg-secondary border-border mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual Images</SelectItem>
              <SelectItem value="series">Series Images</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Category *</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-secondary border-border mt-1">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {imageCategories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {contentType === "series" && (
          <div>
            <Label>Series *</Label>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="bg-secondary border-border mt-1">
                <SelectValue placeholder="Select series" />
              </SelectTrigger>
              <SelectContent>
                {adultSeriesList?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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

          <Button onClick={handleImport} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {images.length} Image{images.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}