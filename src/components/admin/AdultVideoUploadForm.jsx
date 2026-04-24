import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Wand2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultVideoUploadForm({ adultSeriesList, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    content_type: "movie",
    is_featured: false,
    is_adult: true,
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleVideoUpload = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("video_url", file_url);
    setUploadingVideo(false);
    toast.success("Video uploaded!");
  };

  const handleThumbUpload = async (file) => {
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("thumbnail_url", file_url);
    setUploadingThumb(false);
    toast.success("Thumbnail uploaded!");
  };

  const handleAiFill = async () => {
    if (!form.title) { toast.error("Enter a title first"); return; }
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a short, engaging description (2-3 sentences) and suggest a category for adult content titled: "${form.title}". Be tasteful but descriptive.`,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
        },
      },
    });
    if (res?.description) set("description", res.description);
    setAiLoading(false);
    toast.success("AI description generated!");
  };

  const handleFetchPoster = async () => {
    if (!form.title) { toast.error("Enter a title first"); return; }
    setFetchingPoster(true);
    const res = await base44.functions.invoke("fetchPoster", { title: form.title, type: "movie" });
    if (res?.data?.thumbnail_url) {
      set("thumbnail_url", res.data.thumbnail_url);
      toast.success("Poster fetched!");
    } else {
      toast.error("No poster found");
    }
    setFetchingPoster(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.video_url) { toast.error("Title and video URL are required"); return; }
    setSaving(true);
    const record = {
      ...form,
      is_adult: true,
    };
    await base44.entities.Video.create(record);
    toast.success("Adult video added!");
    setForm({ title: "", description: "", video_url: "", thumbnail_url: "", content_type: "movie", is_featured: false, is_adult: true });
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Title *</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Title" className="bg-secondary border-border" required />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Description</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-red-500/30 text-red-400 hover:text-red-300" onClick={handleFetchPoster} disabled={fetchingPoster}>
                {fetchingPoster ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Auto Poster
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-red-500/30 text-red-400 hover:text-red-300" onClick={handleAiFill} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI Fill
              </Button>
            </div>
          </div>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Description" className="bg-secondary border-border" rows={3} />
        </div>



        <div className="space-y-2">
          <Label>Video / Image URL</Label>
          <div className="flex gap-2">
            <Input value={form.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://..." className="bg-secondary border-border flex-1" />
            <Button type="button" variant="secondary" className="relative overflow-hidden shrink-0 gap-1.5" disabled={uploadingVideo}>
              {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <input type="file" accept="video/*,image/*" onChange={e => handleVideoUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Thumbnail</Label>
          <div className="flex gap-2">
            <Input value={form.thumbnail_url} onChange={e => set("thumbnail_url", e.target.value)} placeholder="https://..." className="bg-secondary border-border flex-1" />
            <Button type="button" variant="secondary" className="relative overflow-hidden shrink-0 gap-1.5" disabled={uploadingThumb}>
              {uploadingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <input type="file" accept="image/*" onChange={e => handleThumbUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            </Button>
          </div>
          {form.thumbnail_url && <img src={form.thumbnail_url} alt="" className="h-16 w-28 rounded object-cover" />}
        </div>

        <div className="flex items-center gap-3 md:col-span-2">
          <Switch checked={form.is_featured} onCheckedChange={v => set("is_featured", v)} id="featured" />
          <Label htmlFor="featured">Feature on Leaks hero</Label>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Add Adult Content
      </Button>
    </form>
  );
}