import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

export default function EditVideoModal({ video, seriesList, franchises = [], open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: video?.title || "",
    description: video?.description || "",
    video_url: video?.video_url || "",
    thumbnail_url: video?.thumbnail_url || "",
    series_id: video?.series_id || "",
    franchise_id: video?.franchise_id || "",
    episode_number: video?.episode_number || "",
    sort_order: video?.sort_order ?? "",
    duration: video?.duration || "",
    is_featured: video?.is_featured || false,
    is_adult: video?.is_adult || false,
    content_type: video?.content_type || "movie",
    coming_soon: video?.coming_soon || false,
    release_date: video?.release_date || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [fetchingAiInfo, setFetchingAiInfo] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);

  const handleAiDescription = async () => {
    if (!form.title) return;
    setFetchingAiInfo(true);
    try {
      const type = form.content_type === "episode" ? "episode" : "movie";
      const res = await base44.functions.invoke("aiMediaInfo", { title: form.title, type });
      if (res.data?.description) {
        update("description", res.data.description);
        toast.success("AI description applied!");
      } else {
        toast.error("Couldn't find info for that title");
      }
    } catch (e) {
      toast.error("AI info failed");
    }
    setFetchingAiInfo(false);
  };

  const handleAutoFetchPoster = async () => {
    if (!form.title) return;
    setFetchingPoster(true);
    try {
      const type = form.content_type === "episode" ? "tv" : "movie";
      const res = await base44.functions.invoke("fetchPoster", { title: form.title, type, videoId: video?.id });
      if (res.data?.poster_url) {
        update("thumbnail_url", res.data.poster_url);
        toast.success("Poster found!");
      } else {
        toast.error("No poster found — try uploading manually");
      }
    } catch (e) {
      toast.error("Failed to fetch poster");
    }
    setFetchingPoster(false);
  };

  useEffect(() => {
    if (video) {
      setForm({
        title: video.title || "",
        description: video.description || "",
        video_url: video.video_url || "",
        thumbnail_url: video.thumbnail_url || "",
        series_id: video.series_id || "",
        franchise_id: video.franchise_id || "",
        episode_number: video.episode_number || "",
        sort_order: video.sort_order ?? "",
        duration: video.duration || "",
        is_featured: video.is_featured || false,
        is_adult: video.is_adult || false,
        content_type: video.content_type || "movie",
        coming_soon: video.coming_soon || false,
        release_date: video.release_date || "",
      });
    }
  }, [video?.id]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("thumbnail_url", file_url);
    setUploadingThumb(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Video.update(video.id, {
      ...form,
      episode_number: form.episode_number ? Number(form.episode_number) : undefined,
      sort_order: form.sort_order !== "" ? Number(form.sort_order) : 0,
      series_id: form.series_id || undefined,
      franchise_id: form.franchise_id || undefined,
    });
    toast.success("Video updated!");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAiDescription} disabled={fetchingAiInfo || !form.title} className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7">
                {fetchingAiInfo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Auto-Fill
              </Button>
            </div>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="bg-secondary border-border h-20" placeholder="Description or use AI Auto-Fill" />
          </div>
          <div className="space-y-1">
            <Label>Video URL</Label>
            <Input value={form.video_url} onChange={(e) => update("video_url", e.target.value)} className="bg-secondary border-border" placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label>Thumbnail</Label>
            <div className="flex gap-2">
              <Input value={form.thumbnail_url} onChange={(e) => update("thumbnail_url", e.target.value)} className="bg-secondary border-border flex-1" placeholder="URL or upload →" />
              <Button type="button" variant="secondary" onClick={handleAutoFetchPoster} disabled={fetchingPoster || !form.title} title="Auto-fetch poster">
                {fetchingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingThumb}>
                {uploadingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </Button>
            </div>
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="Preview" className="h-16 rounded object-cover border border-border mt-1" />
            )}
          </div>
          <div className="space-y-1">
            <Label>Content Type</Label>
            <Select value={form.content_type} onValueChange={(v) => update("content_type", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="episode">TV Episode</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Episode #</Label>
              <Input type="number" value={form.episode_number} onChange={(e) => update("episode_number", e.target.value)} className="bg-secondary border-border" placeholder="1" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="bg-secondary border-border" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Series</Label>
            <Select value={form.series_id || " "} onValueChange={(v) => update("series_id", v.trim() ? v : "")}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="No series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">No Series</SelectItem>
                {seriesList?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {franchises.length > 0 && (
            <div className="space-y-1">
              <Label>Franchise / Collection</Label>
              <Select value={form.franchise_id || "_none"} onValueChange={(v) => update("franchise_id", v === "_none" ? "" : v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="No franchise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No Franchise</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Duration</Label>
            <Input value={form.duration} onChange={(e) => update("duration", e.target.value)} className="bg-secondary border-border" placeholder="e.g. 24:30" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Switch checked={form.coming_soon} onCheckedChange={(v) => update("coming_soon", v)} />
            <div className="flex-1">
              <Label className="text-amber-400 font-semibold">Coming Soon</Label>
              <p className="text-xs text-muted-foreground">Hides play button until a video file is added</p>
            </div>
          </div>
          {form.coming_soon && (
            <div className="space-y-1">
              <Label>Release Date</Label>
              <Input type="date" value={form.release_date} onChange={(e) => update("release_date", e.target.value)} className="bg-secondary border-border" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={form.is_featured} onCheckedChange={(v) => update("is_featured", v)} />
            <Label>Featured on homepage hero</Label>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <Switch checked={form.is_adult} onCheckedChange={(v) => update("is_adult", v)} />
            <div>
              <Label className="text-red-400 font-semibold">18+ Adult Content</Label>
              <p className="text-xs text-muted-foreground">Only visible to age-verified users in the Adult tab</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}