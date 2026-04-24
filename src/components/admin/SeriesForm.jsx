import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "other"];

export default function SeriesForm({ franchises = [], onSuccess }) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    cover_image: "",
    category: "",
    franchise_id: "",
    is_adult: false,
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, cover_image: file_url }));
    setUploadingCover(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      category: form.category || undefined,
      franchise_id: form.franchise_id || undefined,
    };
    await base44.entities.Series.create(payload);
    toast.success("Series created!");
    setForm({ title: "", description: "", cover_image: "", category: "", franchise_id: "" });
    onSuccess?.();
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Series Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Series name"
          required
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What's this series about?"
          className="bg-secondary border-border h-20"
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => update("category", v)}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1).replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label>Cover Image</Label>
        <div className="flex gap-3">
          <Input
            value={form.cover_image}
            onChange={(e) => update("cover_image", e.target.value)}
            placeholder="Cover image URL or upload →"
            className="bg-secondary border-border flex-1"
          />
          <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingCover}>
            {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
        <Switch
          checked={form.is_adult}
          onCheckedChange={(v) => update("is_adult", v)}
        />
        <div>
          <Label className="text-red-400 font-semibold">18+ Adult Content</Label>
          <p className="text-xs text-muted-foreground">Only visible to age-verified users in the Adult tab</p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 font-bold"
        disabled={!form.title}
      >
        Create Series
      </Button>
    </form>
  );
}