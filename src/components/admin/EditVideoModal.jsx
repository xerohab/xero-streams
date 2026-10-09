import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Sparkles, Wand2, Search, AudioLines } from "lucide-react";
import toast from "react-hot-toast";
import SeriesSearchSelect from "@/components/admin/SeriesSearchSelect";
import FranchiseSearchSelect from "@/components/admin/FranchiseSearchSelect";
import GenreSelect from "@/components/admin/GenreSelect";
import { normaliseToGenres, resolveVideoGenres } from "@/lib/genreAdmin";

export default function EditVideoModal({ video, seriesList, franchises = [], categories = [], open, onClose, onSaved }) {
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
    quality: video?.quality || "Unknown",
    quality_notes: video?.quality_notes || "",
    genres: video?.genres || [],
    coming_soon: video?.coming_soon || false,
    release_date: video?.release_date || "",
    release_year: video?.release_year ?? "",
    cast: video?.cast || "",
    is_for_sale: video?.is_for_sale || false,
    price: video?.price ?? "",
    download_url: video?.download_url || "",
    intro_start: video?.intro_start ?? "",
    intro_end: video?.intro_end ?? "",
    recap_start: video?.recap_start ?? "",
    recap_end: video?.recap_end ?? "",
    subtitles: video?.subtitles || [],
    main_cast: (video?.main_cast || []).join(", "),
    guest_stars: (video?.guest_stars || []).join(", "),
    director_or_creator: video?.director_or_creator || "",
    age_rating: video?.age_rating || "",
    runtime_or_episodes: video?.runtime_or_episodes || "",
    season_number: video?.season_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [fetchingAiInfo, setFetchingAiInfo] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [fetchingSubs, setFetchingSubs] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const handleFetchSubs = async () => {
    if (!form.title) {
        toast.error("Please fill the title first");
        return;
    }
    setFetchingSubs(true);
    try {
        const seriesName = seriesList?.find((s) => s.id === form.series_id)?.title;
        const res = await base44.functions.invoke("fetchOpenSubtitles", {
            title: seriesName ? `${seriesName} ${form.title}` : form.title,
            episode_number: form.episode_number,
        });
        if (res.data?.vtt) {
            const file = new File([res.data.vtt], `${form.title}-subs.vtt`, { type: 'text/vtt' });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            update("subtitles", [...(form.subtitles || []), { language: "en", label: "English", url: file_url }]);
            toast.success("Subtitles found and attached!");
        } else {
            toast.error(res.data?.error || "No subtitles found");
        }
    } catch (e) {
        toast.error("Failed to fetch subtitles");
    }
    setFetchingSubs(false);
  };

  const handleTranscribe = async () => {
    if (!form.video_url) {
        toast.error("Please add a video URL first");
        return;
    }
    setTranscribing(true);
    const toastId = toast.loading("Starting AI transcription...");
    try {
        const res = await base44.functions.invoke("startAssemblyTranscription", { videoUrl: form.video_url });
        if (res.data?.error) throw new Error(res.data.error);
        const transcriptId = res.data.id;
        
        toast.loading("Transcribing video audio (this may take a few minutes)...", { id: toastId });
        
        const checkStatus = async () => {
            const checkRes = await base44.functions.invoke("checkAssemblyTranscription", { transcriptId });
            if (checkRes.data?.status === 'completed') {
                const file = new File([checkRes.data.vtt], `${form.title || 'auto'}-subs.vtt`, { type: 'text/vtt' });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                update("subtitles", [...(form.subtitles || []), { language: "en", label: "English (Auto)", url: file_url }]);
                toast.success("AI Transcription complete!", { id: toastId });
                setTranscribing(false);
            } else if (checkRes.data?.status === 'error') {
                toast.error("Transcription failed", { id: toastId });
                setTranscribing(false);
            } else {
                setTimeout(checkStatus, 5000);
            }
        };
        
        setTimeout(checkStatus, 5000);
    } catch (e) {
        toast.error(e.message || "Failed to start transcription", { id: toastId });
        setTranscribing(false);
    }
  };

  const handleAiFetch = async () => {
    setFetchingAiInfo(true);
    try {
      const type = form.content_type === "episode" ? "episode" : "movie";
      const seriesName = seriesList?.find((s) => s.id === form.series_id)?.title;
      const res = await base44.functions.invoke("aiMediaInfo", {
        title: form.title || "",
        type,
        seriesName,
        episodeNumber: form.episode_number,
        seasonNumber: form.season_number,
      });
      if (res.data?.title || res.data?.description || res.data?.genres?.length) {
        if (res.data.title) update("title", res.data.title);
        if (res.data.description) update("description", res.data.description);
        const genres = normaliseToGenres(res.data?.genres);
        if (genres.length) update("genres", genres);
        toast.success("AI info applied!");
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
    if (!form.title) { toast.error("Please fill the title first"); return; }
    setFetchingGemini(true);
    try {
      const type = form.content_type === "episode" ? "tv" : "movie";
      const seriesName = seriesList?.find((s) => s.id === form.series_id)?.title;
      const res = await base44.functions.invoke("fetchGeminiMetadata", {
        title: form.title,
        content_type: type,
        seriesName,
        episodeNumber: form.episode_number,
        seasonNumber: form.season_number,
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
        quality: video.quality || "Unknown",
        quality_notes: video.quality_notes || "",
        coming_soon: video.coming_soon || false,
        release_date: video.release_date || "",
        release_year: video.release_year ?? "",
        cast: video.cast || "",
        is_for_sale: video.is_for_sale || false,
        price: video.price ?? "",
        download_url: video.download_url || "",
        intro_start: video.intro_start ?? "",
        intro_end: video.intro_end ?? "",
        recap_start: video.recap_start ?? "",
        recap_end: video.recap_end ?? "",
        subtitles: video.subtitles || [],
        genres: video?.genres || [],
        main_cast: (video.main_cast || []).join(", "),
        guest_stars: (video.guest_stars || []).join(", "),
        director_or_creator: video.director_or_creator || "",
        age_rating: video.age_rating || "",
        runtime_or_episodes: video.runtime_or_episodes || "",
        season_number: video.season_number || "",
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
      content_updated_at: new Date().toISOString(),
      episode_number: form.episode_number ? Number(form.episode_number) : null,
      season_number: form.season_number ? Number(form.season_number) : null,
      sort_order: form.sort_order !== "" ? Number(form.sort_order) : 0,
      series_id: form.series_id || null,
      franchise_id: form.franchise_id || null,
      release_year: form.release_year ? Number(form.release_year) : null,
      cast: form.cast || "",
      is_for_sale: form.is_for_sale,
      quality: form.quality,
      quality_notes: form.quality_notes || "",
      price: form.price !== "" ? Number(form.price) : null,
      download_url: form.download_url || "",
      intro_start: form.intro_start !== "" ? Number(form.intro_start) : null,
      intro_end: form.intro_end !== "" ? Number(form.intro_end) : null,
      recap_start: form.recap_start !== "" ? Number(form.recap_start) : null,
      recap_end: form.recap_end !== "" ? Number(form.recap_end) : null,
      subtitles: form.subtitles,
      main_cast: form.main_cast ? form.main_cast.split(",").map(s => s.trim()).filter(Boolean) : [],
      guest_stars: form.guest_stars ? form.guest_stars.split(",").map(s => s.trim()).filter(Boolean) : [],
      director_or_creator: form.director_or_creator || "",
      age_rating: form.age_rating || "",
      runtime_or_episodes: form.runtime_or_episodes || "",
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
              <Button type="button" variant="ghost" size="sm" onClick={handleAiFetch} disabled={fetchingAiInfo} className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7">
                {fetchingAiInfo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {fetchingAiInfo ? "Searching..." : "AI Auto-Fill"}
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
                {fetchingGemini ? "Fetching..." : "Gemini Metadata"}
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
              <Label>Quality</Label>
              <Select value={form.quality} onValueChange={(v) => update("quality", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unknown">Unknown / Auto</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                  <SelectItem value="Full HD">Full HD (1080p)</SelectItem>
                  <SelectItem value="HD">HD (720p)</SelectItem>
                  <SelectItem value="CAM">CAM / TS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quality Notes</Label>
              <Input value={form.quality_notes} onChange={(e) => update("quality_notes", e.target.value)} className="bg-secondary border-border" placeholder="e.g. Chinese Subs, Hardcoded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Season #</Label>
              <Input type="number" value={form.season_number} onChange={(e) => update("season_number", e.target.value)} className="bg-secondary border-border" placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <Label>Episode #</Label>
              <Input type="number" value={form.episode_number} onChange={(e) => update("episode_number", e.target.value)} className="bg-secondary border-border" placeholder="1" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="bg-secondary border-border" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Release Year</Label>
              <Input type="number" value={form.release_year} onChange={(e) => update("release_year", e.target.value)} className="bg-secondary border-border" placeholder="e.g. 2023" />
            </div>
            <div className="space-y-1">
              <Label>Cast (legacy)</Label>
              <Input value={form.cast} onChange={(e) => update("cast", e.target.value)} className="bg-secondary border-border" placeholder="Tom Hanks, ..." />
            </div>
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
              <Label>Director / Creator</Label>
              <Input value={form.director_or_creator} onChange={(e) => update("director_or_creator", e.target.value)} className="bg-secondary border-border" placeholder="Director or showrunner" />
            </div>
            <div className="space-y-1">
              <Label>Age Rating</Label>
              <Input value={form.age_rating} onChange={(e) => update("age_rating", e.target.value)} className="bg-secondary border-border" placeholder="e.g. PG-13, TV-MA" />
            </div>
            <div className="space-y-1">
              <Label>Runtime / Episodes</Label>
              <Input value={form.runtime_or_episodes} onChange={(e) => update("runtime_or_episodes", e.target.value)} className="bg-secondary border-border" placeholder="e.g. 120 mins, 10 Episodes" />
            </div>
          </div>
          <GenreSelect value={form.genres} onChange={(arr) => update("genres", arr)} label="Genres" aiDetected={!!form.genres.length} />
          <SeriesSearchSelect
            seriesList={seriesList}
            value={form.series_id}
            onChange={(id) => update("series_id", id)}
            label="Series"
          />
          {franchises.length > 0 && (
            <FranchiseSearchSelect franchises={franchises} value={form.franchise_id} onChange={(id) => update("franchise_id", id)} />
          )}
          <div className="space-y-1">
            <Label>Duration</Label>
            <Input value={form.duration} onChange={(e) => update("duration", e.target.value)} className="bg-secondary border-border" placeholder="e.g. 24:30" />
          </div>

          {/* Skip Times */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg">
            <div className="space-y-1">
              <Label>Intro Start (sec)</Label>
              <Input type="number" value={form.intro_start} onChange={(e) => update("intro_start", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label>Intro End (sec)</Label>
              <Input type="number" value={form.intro_end} onChange={(e) => update("intro_end", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label>Recap Start (sec)</Label>
              <Input type="number" value={form.recap_start} onChange={(e) => update("recap_start", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label>Recap End (sec)</Label>
              <Input type="number" value={form.recap_end} onChange={(e) => update("recap_end", e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Subtitles */}
          <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
            <Label className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>Subtitles / Audio Tracks (.vtt)</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleFetchSubs} disabled={fetchingSubs}>
                    {fetchingSubs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Search OpenSubtitles
                </Button>
                <Button type="button" variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleTranscribe} disabled={transcribing}>
                    {transcribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <AudioLines className="w-3 h-3" />}
                    AI Transcribe
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => update("subtitles", [...(form.subtitles || []), { language: "en", label: "English", url: "" }])}>
                    + Add Track
                </Button>
              </div>
            </Label>
            {form.subtitles?.map((sub, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Lang (en)" value={sub.language} onChange={(e) => {
                  const newSubs = [...form.subtitles];
                  newSubs[i].language = e.target.value;
                  update("subtitles", newSubs);
                }} className="w-20 bg-secondary border-border text-xs" />
                <Input placeholder="Label" value={sub.label} onChange={(e) => {
                  const newSubs = [...form.subtitles];
                  newSubs[i].label = e.target.value;
                  update("subtitles", newSubs);
                }} className="w-24 bg-secondary border-border text-xs" />
                <Input placeholder="URL" value={sub.url} onChange={(e) => {
                  const newSubs = [...form.subtitles];
                  newSubs[i].url = e.target.value;
                  update("subtitles", newSubs);
                }} className="flex-1 bg-secondary border-border text-xs" />
                <Button type="button" variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => {
                  const newSubs = form.subtitles.filter((_, idx) => idx !== i);
                  update("subtitles", newSubs);
                }}>X</Button>
              </div>
            ))}
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
          <div className="flex items-center gap-3 p-3 bg-secondary border border-border rounded-lg">
            <Switch checked={form.is_for_sale} onCheckedChange={(v) => update("is_for_sale", v)} />
            <div>
              <Label className="font-semibold">Available for Download Purchase</Label>
              <p className="text-xs text-muted-foreground">Users can buy this to download it</p>
            </div>
          </div>
          {form.is_for_sale && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label>Download URL</Label>
                <Input value={form.download_url} onChange={(e) => update("download_url", e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
          )}
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