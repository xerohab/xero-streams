import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Wand2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "other"];

export default function AdultSeriesForm({ onSuccess }) {
  const [form, setForm] = useState({ title: "", description: "", cover_image: "", category: "" });
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCoverUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("cover_image", file_url);
    setUploading(false);
    toast.success("Cover uploaded!");
  };

  const handleAiFill = async () => {
    if (!form.title) { toast.error("Enter a title first"); return; }
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a short compelling description (2-3 sentences) for an adult content series called: "${form.title}". Be tasteful but descriptive. Also suggest a category from: ${CATEGORIES.join(", ")}.`,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          category: { type: "string" },
        },
      },
    });
    if (res?.description) set("description", res.description);
    if (res?.category && CATEGORIES.includes(res.category)) set("category", res.category);
    setAiLoading(false);
    toast.success("AI filled!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error("Title is required"); return; }
    setSaving(true);
    await base44.entities.Series.create({ ...form, is_adult: true });
    toast.success("Adult series created!");
    setForm({ title: "", description: "", cover_image: "", category: "" });
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Series Title *</Label>
        <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Title" className="bg-secondary border-border" required />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-red-500/30 text-red-400 hover:text-red-300" onClick={handleAiFill} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI Auto-Fill
          </Button>
        </div>
        <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Description" className="bg-secondary border-border" rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={v => set("category", v)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cover Image</Label>
        <div className="flex gap-2">
          <Input value={form.cover_image} onChange={e => set("cover_image", e.target.value)} placeholder="https://..." className="bg-secondary border-border flex-1" />
          <Button type="button" variant="secondary" className="relative overflow-hidden shrink-0" disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <input type="file" accept="image/*" onChange={e => handleCoverUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          </Button>
        </div>
        {form.cover_image && <img src={form.cover_image} alt="" className="h-20 w-32 rounded object-cover" />}
      </div>

      <Button type="submit" disabled={saving || !form.title} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Create Adult Series
      </Button>
    </form>
  );
}