import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Sparkles, Wand2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import FranchiseSearchSelect from "@/components/admin/FranchiseSearchSelect";
import GenreSelect from "@/components/admin/GenreSelect";
import { normaliseToGenres } from "@/lib/genreAdmin";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "crime", "mystery", "fantasy", "romance", "animation", "adventure", "other"];

export default function EditFranchiseModal({ franchise, franchises = [], open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: franchise?.title || "",
    description: franchise?.description || "",
    cover_image: franchise?.cover_image || "",
    genres: franchise?.genres || [],
    parent_id: franchise?.parent_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fetchingAiInfo, setFetchingAiInfo] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [aiNaming, setAiNaming] = useState(false);

  useEffect(() => {
    if (franchise) {
      setForm({
        title: franchise.title || "",
        description: franchise.description || "",
        cover_image: franchise.cover_image || "",
        genres: franchise.genres || [],
        parent_id: franchise.parent_id || "",
      });
    }
  }, [franchise]);

  const handleAiDescription = async () => {
    if (!form.title) return;
    setFetchingAiInfo(true);
    try {
      const res = await base44.functions.invoke("aiMediaInfo", { title: form.title, type: "franchise" });
      if (res.data?.description || res.data?.genres?.length) {
        const updates = { description: res.data.description };
        const genres = normaliseToGenres(res.data?.genres);
        if (genres.length && !form.genres.length) updates.genres = genres;
        setForm((prev) => ({ ...prev, ...updates }));
        toast.success("AI info applied!");
      } else {
        toast.error("Couldn't find info for that title");
      }
    } catch (e) {
      toast.error("AI info failed");
    }
    setFetchingAiInfo(false);
  };

  const handleGenerateCover = async () => {
    if (!form.title) return;
    setGeneratingCover(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional movie franchise collection cover poster for "${form.title}". Cinematic, dramatic lighting, high quality, dark moody aesthetic, suitable for a streaming platform. No text overlays.`,
      });
      update("cover_image", url);
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
        prompt: `The user is adding a movie franchise / collection called "${form.title}". Identify the official or most common name for this franchise (e.g. "The Fast and the Furious Collection", "Harry Potter Collection"). Only return the corrected/confirmed title, nothing else.`,
      });
      const suggested = (typeof res === "string" ? res : "").trim().replace(/^["']|["']$/g, "");
      if (suggested && suggested !== form.title) {
        update("title", suggested);
        toast.success(`Title corrected to: ${suggested}`);
      } else {
        toast("Title looks correct!", { icon: "✓" });
      }
    } catch (e) {
      toast.error("AI naming failed");
    }
    setAiNaming(false);
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

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("cover_image", file_url);
    setUploadingCover(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Franchise.update(franchise.id, {
      ...form,
      content_updated_at: new Date().toISOString(),
      genres: form.genres.length ? form.genres : undefined,
      parent_id: form.parent_id || undefined,
    });
    toast.success("Franchise updated!");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  // Filter out the current franchise from parent options to avoid self-reference
  const parentOptions = franchises.filter(f => f.id !== franchise?.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Franchise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2 overflow-y-auto flex-1 pr-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Title</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAiName} disabled={aiNaming || !form.title} className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7">
                {aiNaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Correct Name
              </Button>
            </div>
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
            <Label>Genres</Label>
            <GenreSelect value={form.genres} onChange={(arr) => update("genres", arr)} label="" />
          </div>

          {parentOptions.length > 0 && (
            <div className="space-y-1">
              <FranchiseSearchSelect franchises={parentOptions} value={form.parent_id} onChange={(id) => update("parent_id", id)} label="Parent Franchise (Optional)" />
            </div>
          )}

          <div className="space-y-1">
            <Label>Cover Image</Label>
            <div className="flex gap-2">
              <Input value={form.cover_image} onChange={(e) => update("cover_image", e.target.value)} className="bg-secondary border-border flex-1" placeholder="URL or upload →" />
              <Button type="button" variant="secondary" onClick={handleAutoFetchPoster} disabled={fetchingPoster || !form.title} title="Auto-fetch poster">
                {fetchingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="secondary" onClick={handleGenerateCover} disabled={generatingCover || !form.title} title="AI Generate Cover Image">
                {generatingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingCover}>
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </Button>
            </div>
            {form.cover_image && (
              <img src={form.cover_image} alt="Preview" className="h-16 rounded object-cover border border-border mt-1" />
            )}
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
