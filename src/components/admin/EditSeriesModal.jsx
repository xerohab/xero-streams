import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Sparkles, Wand2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import FranchiseSearchSelect from "@/components/admin/FranchiseSearchSelect";
import GenreSelect from "@/components/admin/GenreSelect";
import { normaliseToGenres } from "@/lib/genreAdmin";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "crime", "mystery", "fantasy", "romance", "animation", "adventure", "other"];

export default function EditSeriesModal({ series, franchises = [], open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: series?.title || "",
    description: series?.description || "",
    cover_image: series?.cover_image || "",
    genres: series?.genres || [],
    franchise_id: series?.franchise_id || "",
    sort_order: series?.sort_order ?? "",
    is_adult: series?.is_adult || false,
    main_cast: (series?.main_cast || []).join(", "),
    guest_stars: (series?.guest_stars || []).join(", "),
    director_or_creator: series?.director_or_creator || "",
    age_rating: series?.age_rating || "",
    runtime_or_episodes: series?.runtime_or_episodes || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fetchingAiInfo, setFetchingAiInfo] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [aiNaming, setAiNaming] = useState(false);

  const handleAiDescription = async () => {
    if (!form.title) return;
    setFetchingAiInfo(true);
    try {
      const res = await base44.functions.invoke("aiMediaInfo", { title: form.title, type: "tv" });
      if (res.data?.description || res.data?.genres?.length) {
        const updates = {};
        if (res.data.description) updates.description = res.data.description;
        const genres = normaliseToGenres(res.data?.genres);
        if (genres.length && !form.genres.length) updates.genres = genres;
        setForm((prev) => ({ ...prev, ...updates }));
        toast.success(genres.length ? `AI info applied — genres: ${genres.join(", ")}` : "AI info applied!");
      } else {
        toast.error("Couldn't find info for that title");
      }
    } catch (e) {
      toast.error("AI info failed");
    }
    setFetchingAiInfo(false);
  };

  const [fetchingGemini, setFetchingGemini] = useState(false);

  const handleGeminiFetch = async () => {
    if (!form.title) return;
    setFetchingGemini(true);
    try {
      const res = await base44.functions.invoke("fetchGeminiMetadata", {
        title: form.title,
        content_type: "tv",
      });
      if (res.data?.main_cast || res.data?.description || res.data?.age_rating) {
        if (res.data.main_cast) update("main_cast", res.data.main_cast.join(", "));
        if (res.data.guest_stars) update("guest_stars", res.data.guest_stars.join(", "));
        if (res.data.description && !form.description) update("description", res.data.description);
        if (res.data.age_rating) update("age_rating", res.data.age_rating);
        if (res.data.director_or_creator) update("director_or_creator", res.data.director_or_creator);
        if (res.data.runtime_or_episodes) update("runtime_or_episodes", res.data.runtime_or_episodes);
        toast.success("Gemini metadata applied!");
      } else {
        toast.error("Couldn't find metadata for that title");
      }
    } catch (e) {
      toast.error("Gemini metadata fetch failed");
    }
    setFetchingGemini(false);
  };

  const handleGenerateCover = async () => {
    if (!form.title) return;
    setGeneratingCover(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional TV series / movie cover poster for "${form.title}". Cinematic, dramatic lighting, high quality, dark moody aesthetic, suitable for a streaming platform. No text overlays.`,
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
        prompt: `The user has a TV series called "${form.title}". If this is part of an anthology series (like American Horror Story, True Detective, American Crime Story, etc.), identify the correct subtitle for this season/entry. For example "American Horror Story Season 5" should return "American Horror Story: Hotel". If it already has the correct subtitle, return it as-is. If it's not an anthology, return the title as-is. Only return the corrected/confirmed title, nothing else.`,
      });
      const suggested = (res || "").trim().replace(/^["']|["']$/g, "");
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
      const res = await base44.functions.invoke("fetchPoster", { title: form.title, type: "tv" });
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
    await base44.entities.Series.update(series.id, {
      ...form,
      content_updated_at: new Date().toISOString(),
      sort_order: form.sort_order !== "" ? Number(form.sort_order) : 0,
      main_cast: form.main_cast ? form.main_cast.split(",").map(s => s.trim()).filter(Boolean) : [],
      guest_stars: form.guest_stars ? form.guest_stars.split(",").map(s => s.trim()).filter(Boolean) : [],
      director_or_creator: form.director_or_creator || "",
      age_rating: form.age_rating || "",
      runtime_or_episodes: form.runtime_or_episodes || "",
    });
    toast.success("Series updated!");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Series</DialogTitle>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGeminiFetch}
                disabled={fetchingGemini || !form.title}
                className="text-xs gap-1.5 text-amber-400 hover:text-amber-300 h-7"
              >
                {fetchingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Gemini Metadata
              </Button>
            </div>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="bg-secondary border-border h-20" placeholder="Description or use AI Auto-Fill" />
          </div>
          <div className="space-y-1">
            <Label>Genres</Label>
            <GenreSelect value={form.genres} onChange={(arr) => update("genres", arr)} label="" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg">
            <div className="space-y-1">
              <Label>Main Cast</Label>
              <Input value={form.main_cast} onChange={(e) => update("main_cast", e.target.value)} className="bg-secondary border-border" placeholder="Comma-separated lead actors" />
            </div>
            <div className="space-y-1">
              <Label>Guest Stars</Label>
              <Input value={form.guest_stars} onChange={(e) => update("guest_stars", e.target.value)} className="bg-secondary border-border" placeholder="Comma-separated guest stars" />
            </div>
            <div className="space-y-1">
              <Label>Creator / Showrunner</Label>
              <Input value={form.director_or_creator} onChange={(e) => update("director_or_creator", e.target.value)} className="bg-secondary border-border" placeholder="Creator or showrunner" />
            </div>
            <div className="space-y-1">
              <Label>Age Rating</Label>
              <Input value={form.age_rating} onChange={(e) => update("age_rating", e.target.value)} className="bg-secondary border-border" placeholder="e.g. TV-MA, TV-14" />
            </div>
            <div className="space-y-1">
              <Label>Runtime / Episodes</Label>
              <Input value={form.runtime_or_episodes} onChange={(e) => update("runtime_or_episodes", e.target.value)} className="bg-secondary border-border" placeholder="e.g. 10 Episodes, 45 mins" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Sort Order <span className="text-muted-foreground font-normal">(within franchise)</span></Label>
            <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="bg-secondary border-border" placeholder="0 = first" />
          </div>
          {franchises.length > 0 && (
            <FranchiseSearchSelect franchises={franchises} value={form.franchise_id} onChange={(id) => update("franchise_id", id)} />
          )}
          <div className="space-y-1">
            <Label>Cover Image</Label>
            <div className="flex gap-2">
              <Input value={form.cover_image} onChange={(e) => update("cover_image", e.target.value)} className="bg-secondary border-border flex-1" placeholder="URL or upload →" />
              <Button type="button" variant="secondary" onClick={handleAutoFetchPoster} disabled={fetchingPoster || !form.title} title="Auto-fetch poster from TMDB">
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