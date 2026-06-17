import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, Link as LinkIcon, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { detectVideoQuality } from "@/lib/qualityDetection";

const emptyEpisode = () => ({
  title: "",
  description: "",
  video_url: "",
  thumbnail_url: "",
  episode_number: "",
  duration: "",
  quality: "Unknown",
  quality_notes: "",
  uploading: false,
  uploaded: false,
});

export default function BulkEpisodeUpload({ seriesList, onSuccess }) {
  const [selectedSeries, setSelectedSeries] = useState("");
  const [episodes, setEpisodes] = useState([{ ...emptyEpisode(), episode_number: "1" }]);
  const [saving, setSaving] = useState(false);
  const [sourceTab, setSourceTab] = useState("link");

  const updateEp = (index, field, value) => {
    setEpisodes((prev) => prev.map((ep, i) => i === index ? { ...ep, [field]: value } : ep));
  };

  const addEpisode = () => {
    setEpisodes((prev) => {
      const lastEp = prev[prev.length - 1];
      const nextNum = lastEp?.episode_number ? Number(lastEp.episode_number) + 1 : prev.length + 1;
      return [...prev, { ...emptyEpisode(), episode_number: String(nextNum) }];
    });
  };
  const removeEpisode = (index) => setEpisodes((prev) => prev.filter((_, i) => i !== index));

  const handleVideoFileUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    updateEp(index, "uploading", true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEpisodes((prev) => prev.map((ep, i) => i === index ? { ...ep, video_url: file_url, uploading: false, uploaded: true } : ep));
  };

  const handleThumbUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateEp(index, "thumbnail_url", file_url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSeries) { toast.error("Please select a series"); return; }
    const valid = episodes.filter((ep) => ep.title && ep.video_url);
    if (valid.length === 0) { toast.error("Add at least one episode with a title and video"); return; }
    setSaving(true);
    const toastId = toast.loading("Processing & auto-detecting qualities...");
    const seriesCover = seriesList?.find((s) => s.id === selectedSeries)?.cover_image;
    
    const records = [];
    for (const ep of valid) {
      let finalQuality = ep.quality;
      if (finalQuality === "Unknown" && ep.video_url) {
        finalQuality = await detectVideoQuality(ep.video_url, ep.title);
      }
      
      records.push({
        title: ep.title,
        description: ep.description || undefined,
        video_url: ep.video_url,
        thumbnail_url: ep.thumbnail_url || seriesCover || undefined,
        series_id: selectedSeries,
        episode_number: ep.episode_number ? Number(ep.episode_number) : undefined,
        duration: ep.duration || undefined,
        content_type: "episode",
        is_featured: false,
        quality: finalQuality,
        quality_notes: ep.quality_notes || undefined,
      });
    }
    
    await base44.entities.Video.bulkCreate(records);
    toast.success(`${records.length} episode${records.length > 1 ? "s" : ""} added!`, { id: toastId });
    setEpisodes([emptyEpisode()]);
    setSelectedSeries("");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Series *</Label>
        <Select value={selectedSeries} onValueChange={setSelectedSeries}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select a series to add episodes to" />
          </SelectTrigger>
          <SelectContent>
            {seriesList?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Video Source Mode</Label>
        <Tabs value={sourceTab} onValueChange={setSourceTab} className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="link" className="gap-2"><LinkIcon className="w-4 h-4" /> Links</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4" /> Upload Files</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {episodes.map((ep, index) => (
          <div key={index} className="bg-secondary/50 border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Episode {index + 1}</span>
              {episodes.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={() => removeEpisode(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input value={ep.title} onChange={(e) => updateEp(index, "title", e.target.value)} placeholder="Episode title" className="bg-secondary border-border h-9" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Episode #</Label>
                <Input type="number" value={ep.episode_number} onChange={(e) => updateEp(index, "episode_number", e.target.value)} placeholder="1" className="bg-secondary border-border h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={ep.description} onChange={(e) => updateEp(index, "description", e.target.value)} placeholder="Optional description" className="bg-secondary border-border h-16 text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Video {sourceTab === "upload" ? "File" : "URL"} *</Label>
                {sourceTab === "link" ? (
                  <Input value={ep.video_url} onChange={(e) => updateEp(index, "video_url", e.target.value)} placeholder="https://..." className="bg-secondary border-border h-9" />
                ) : (
                  <div className="relative border-2 border-dashed border-border rounded-md p-3 text-center hover:border-primary/50 transition-colors">
                    {ep.uploading ? (
                      <span className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                    ) : ep.uploaded || ep.video_url ? (
                      <span className="text-xs text-green-400 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Uploaded</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Click to upload video</span>
                    )}
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFileUpload(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Thumbnail</Label>
                <div className="flex gap-2">
                  <Input value={ep.thumbnail_url} onChange={(e) => updateEp(index, "thumbnail_url", e.target.value)} placeholder="URL or upload" className="bg-secondary border-border h-9 flex-1" />
                  <Button type="button" variant="secondary" size="icon" className="h-9 w-9 relative overflow-hidden flex-shrink-0">
                    <Upload className="w-3 h-3" />
                    <input type="file" accept="image/*" onChange={(e) => handleThumbUpload(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration</Label>
                <Input value={ep.duration} onChange={(e) => updateEp(index, "duration", e.target.value)} placeholder="e.g. 24:30" className="bg-secondary border-border h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quality</Label>
                <div className="flex gap-2">
                  <Select value={ep.quality || "Unknown"} onValueChange={(v) => updateEp(index, "quality", v)}>
                    <SelectTrigger className="bg-secondary border-border h-9 w-32 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unknown">Auto Detect</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                      <SelectItem value="Full HD">Full HD</SelectItem>
                      <SelectItem value="HD">HD</SelectItem>
                      <SelectItem value="CAM">CAM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={ep.quality_notes || ""} onChange={(e) => updateEp(index, "quality_notes", e.target.value)} placeholder="Notes (e.g. HC Subs)" className="bg-secondary border-border h-9 flex-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addEpisode} className="w-full border-dashed border-border gap-2">
        <Plus className="w-4 h-4" /> Add Another Episode
      </Button>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold" disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : `Save ${episodes.length} Episode${episodes.length > 1 ? "s" : ""}`}
      </Button>
    </form>
  );
}