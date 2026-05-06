import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, Layers, Sparkles, ImageIcon, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import FranchiseSearchSelect from "@/components/admin/FranchiseSearchSelect";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "other"];

export default function SeriesForm({ franchises = [], onSuccess }) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [aiNaming, setAiNaming] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    cover_image: "",
    category: "",
    franchise_id: "",
    is_adult: false,
  });
  const [bulkCount, setBulkCount] = useState(2);

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, cover_image: file_url }));
    setUploadingCover(false);
  };

  const handleGenerateCover = async () => {
    if (!form.title) return;
    setGeneratingCover(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional TV series / movie cover poster for "${form.title}". Cinematic, dramatic lighting, high quality, dark moody aesthetic, suitable for a streaming platform. No text overlays.`,
      });
      setForm((prev) => ({ ...prev, cover_image: url }));
      toast.success("AI cover generated!");
    } catch (e) {
      toast.error("Failed to generate cover");
    }
    setGeneratingCover(false);
  };

  const handleAiName = async () => {
    if (!form.title) return;
    setAiNaming(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `The user is adding a TV series called "${form.title}". If this is part of an anthology series (like American Horror Story, True Detective, American Crime Story, etc.), identify the correct subtitle for this season/entry. For example "American Horror Story Season 5" should return "American Horror Story: Hotel". If it already has the correct subtitle, return it as-is. If it's not an anthology, return the title as-is. Only return the corrected/confirmed title, nothing else.`,
      });
      const suggested = (res || "").trim().replace(/^["']|["']$/g, "");
      if (suggested && suggested !== form.title) {
        setForm((prev) => ({ ...prev, title: suggested }));
        toast.success(`Title corrected to: ${suggested}`);
      } else {
        toast("Title looks correct!", { icon: "✓" });
      }
    } catch (e) {
      toast.error("AI naming failed");
    }
    setAiNaming(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const base = {
      description: form.description || undefined,
      cover_image: form.cover_image || undefined,
      category: form.category || undefined,
      franchise_id: form.franchise_id || undefined,
      is_adult: form.is_adult,
    };

    if (bulkMode) {
      const seriesArray = Array.from({ length: bulkCount }, (_, i) => ({
        ...base,
        title: `${form.title} Season ${i + 1}`,
        sort_order: i + 1,
      }));
      await base44.entities.Series.bulkCreate(seriesArray);
      toast.success(`Created ${bulkCount} series for "${form.title}"!`);
    } else {
      await base44.entities.Series.create({ ...base, title: form.title });
      toast.success("Series created!");
    }

    setForm({ title: "", description: "", cover_image: "", category: "", franchise_id: "", is_adult: false });
    setBulkCount(2);
    setSubmitting(false);
    onSuccess?.();
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={!bulkMode ? "default" : "secondary"} onClick={() => setBulkMode(false)} className="flex-1">
          Single Series
        </Button>
        <Button type="button" size="sm" variant={bulkMode ? "default" : "secondary"} onClick={() => setBulkMode(true)} className="flex-1 gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Bulk Create (Multiple Seasons)
        </Button>
      </div>
      <div className="space-y-2">
        <Label>{bulkMode ? "Show Name *" : "Series Title *"}</Label>
        <div className="flex gap-2">
          <Input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={bulkMode ? "e.g. Breaking Bad" : "Series name"}
            required
            className="bg-secondary border-border flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAiName}
            disabled={aiNaming || !form.title}
            title="AI correct anthology title (e.g. AHS Season 5 → AHS: Hotel)"
            className="gap-1.5 shrink-0"
          >
            {aiNaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Name
          </Button>
        </div>
        {bulkMode && form.title && (
          <p className="text-xs text-muted-foreground">Will create: {form.title} Season 1, {form.title} Season 2…</p>
        )}
      </div>

      {bulkMode && (
        <div className="space-y-2">
          <Label>Number of Seasons *</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={bulkCount}
            onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value)))}
            className="bg-secondary border-border w-32"
          />
        </div>
      )}

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
        <FranchiseSearchSelect franchises={franchises} value={form.franchise_id} onChange={(id) => update("franchise_id", id)} />
      )}

      <div className="space-y-2">
        <Label>Cover Image</Label>
        <div className="flex gap-2">
          <Input
            value={form.cover_image}
            onChange={(e) => update("cover_image", e.target.value)}
            placeholder="Cover image URL or upload →"
            className="bg-secondary border-border flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateCover}
            disabled={generatingCover || !form.title}
            title="AI Generate Cover"
          >
            {generatingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </Button>
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
        {form.cover_image && (
          <img src={form.cover_image} alt="Preview" className="h-20 rounded object-cover border border-border" />
        )}
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
        disabled={!form.title || submitting}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : bulkMode ? `Create ${bulkCount} Seasons` : "Create Series"}
      </Button>
    </form>
  );
}