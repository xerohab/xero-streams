import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Sparkles, Wand2, ImageIcon } from "lucide-react";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "crime", "mystery", "fantasy", "romance", "animation", "adventure", "other"];
import toast from "react-hot-toast";
import FranchiseSearchSelect from "./FranchiseSearchSelect";

export default function FranchiseForm({ onSuccess }) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fetchingAiInfo, setFetchingAiInfo] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [aiNaming, setAiNaming] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cover_image: "", category: "", parent_id: "" });

  const [franchises, setFranchises] = useState([]);
  useEffect(() => {
    base44.entities.Franchise.list().then(setFranchises).catch(() => {});
  }, []);

  const handleAiDescription = async () => {
    if (!form.title) return;
    setFetchingAiInfo(true);
    try {
      const res = await base44.functions.invoke("aiMediaInfo", { title: form.title, type: "franchise" });
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
      const res = await base44.functions.invoke("fetchPoster", { title: form.title, type: "movie" });
      if (res.data?.poster_url) {
        update("cover_image", res.data.poster_url);
        toast.success("Poster found!");
      } else {
        toast.error("No poster found — try uploading manually");
      }
    } catch (e) {
      toast.error("Failed to fetch poster");
    }
    setFetchingPoster(false);
  };

  const handleAiName = async () => {
    if (!form.title) return;
    setAiNaming(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `The user is adding a movie franchise / collection called "${form.title}". Identify the official or most common name for this franchise (e.g. "The Fast and the Furious Collection", "Harry Potter Collection"). Only return the corrected/confirmed title, nothing else.`,
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
    await base44.entities.Franchise.create({
      ...form,
      category: form.category || undefined,
      parent_id: form.parent_id || undefined,
    });
    toast.success("Franchise created!");
    setForm({ title: "", description: "", cover_image: "", category: "", parent_id: "" });
    onSuccess?.();
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Franchise / Collection Title *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAiName}
            disabled={aiNaming || !form.title}
            className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7"
          >
            {aiNaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Correct Name
          </Button>
        </div>
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. American Pie, Fast & Furious"
          required
          className="bg-secondary border-border"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAiDescription}
            disabled={fetchingAiInfo || !form.title}
            className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7"
          >
            {fetchingAiInfo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Auto-Fill
          </Button>
        </div>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What's this franchise about? (or use AI Auto-Fill)"
          className="bg-secondary border-border h-20"
        />
      </div>
      <div className="space-y-2">
        <FranchiseSearchSelect
          franchises={franchises}
          value={form.parent_id}
          onChange={(v) => update("parent_id", v)}
          label="Parent Franchise (Optional)"
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
            onClick={handleAutoFetchPoster}
            disabled={fetchingPoster || !form.title}
            title="Auto-fetch poster from title"
          >
            {fetchingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingCover}>
            {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          </Button>
        </div>
        {form.cover_image && (
          <img src={form.cover_image} alt="Cover preview" className="h-20 rounded object-cover border border-border" />
        )}
      </div>
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold" disabled={!form.title}>
        Create Franchise
      </Button>
    </form>
  );
}