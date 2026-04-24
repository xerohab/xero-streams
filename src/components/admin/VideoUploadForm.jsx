import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Loader2, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

export default function VideoUploadForm({ seriesList, franchises = [], onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    series_id: "",
    franchise_id: "",
    episode_number: "",
    duration: "",
    is_featured: false,
    content_type: "movie",
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, video_url: file_url }));
    setUploading(false);
    toast.success("Video uploaded successfully");
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, thumbnail_url: file_url }));
    setUploadingThumb(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      episode_number: form.episode_number ? Number(form.episode_number) : undefined,
      series_id: form.series_id || undefined,
      franchise_id: form.franchise_id || undefined,
    };
    await base44.entities.Video.create(payload);
    toast.success("Video added successfully!");
    setForm({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      series_id: "",
      franchise_id: "",
      episode_number: "",
      duration: "",
      is_featured: false,
      content_type: "movie",
    });
    onSuccess?.();
  };

  const [fetchingPoster, setFetchingPoster] = useState(false);

  const handleAutoFetchPoster = async () => {
    if (!form.title) return;
    setFetchingPoster(true);
    try {
      const type = form.content_type === "episode" ? "tv" : "movie";
      const res = await base44.functions.invoke("fetchPoster", { title: form.title, type });
      if (res.data?.poster_url) {
        update("thumbnail_url", res.data.poster_url);
        toast.success("Poster found!");
      } else {
        toast.error("No poster found for that title");
      }
    } catch (e) {
      toast.error("Failed to fetch poster");
    }
    setFetchingPoster(false);
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Episode title"
          required
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What's this video about?"
          className="bg-secondary border-border h-20"
        />
      </div>

      {/* Video source */}
      <div className="space-y-2">
        <Label>Video Source *</Label>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="upload" className="flex-1 gap-2">
              <Upload className="w-4 h-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 gap-2">
              <LinkIcon className="w-4 h-4" /> Link
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-3">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading video...
                </div>
              ) : form.video_url && !form.video_url.startsWith("http") ? (
                <p className="text-sm text-green-400">Video uploaded ✓</p>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Click to upload video file</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    style={{ position: "relative" }}
                  />
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="link" className="mt-3">
            <Input
              value={form.video_url}
              onChange={(e) => update("video_url", e.target.value)}
              placeholder="https://... or YouTube/Vimeo embed URL"
              className="bg-secondary border-border"
            />
          </TabsContent>
        </Tabs>
        {form.video_url && (
          <p className="text-xs text-muted-foreground truncate">Current: {form.video_url}</p>
        )}
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>Thumbnail</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={form.thumbnail_url}
              onChange={(e) => update("thumbnail_url", e.target.value)}
              placeholder="Thumbnail URL or use buttons →"
              className="bg-secondary border-border"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAutoFetchPoster}
            disabled={fetchingPoster || !form.title}
            title="Auto-fetch poster from title"
          >
            {fetchingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingThumb}>
            {uploadingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
        </div>
        {form.thumbnail_url && (
          <img src={form.thumbnail_url} alt="Thumbnail preview" className="h-20 rounded object-cover border border-border" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Series</Label>
          <Select value={form.series_id} onValueChange={(v) => update("series_id", v)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">No Series</SelectItem>
              {seriesList?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Episode #</Label>
          <Input
            type="number"
            value={form.episode_number}
            onChange={(e) => update("episode_number", e.target.value)}
            placeholder="1"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      {franchises.length > 0 && (
        <div className="space-y-2">
          <Label>Franchise / Collection</Label>
          <Select value={form.franchise_id} onValueChange={(v) => update("franchise_id", v === "_none" ? "" : v)}>
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

      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          value={form.duration}
          onChange={(e) => update("duration", e.target.value)}
          placeholder="e.g. 24:30"
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
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

      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_featured}
          onCheckedChange={(v) => update("is_featured", v)}
        />
        <Label>Featured on homepage hero</Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 font-bold"
        disabled={!form.title || !form.video_url || uploading}
      >
        Add Video
      </Button>
    </form>
  );
}