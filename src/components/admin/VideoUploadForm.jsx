import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Loader2, Wand2, Sparkles, Search, AudioLines } from "lucide-react";
import toast from "react-hot-toast";
import SeriesSearchSelect from "@/components/admin/SeriesSearchSelect";
import FranchiseSearchSelect from "@/components/admin/FranchiseSearchSelect";
import GenreSelect from "@/components/admin/GenreSelect";
import { normaliseToGenres } from "@/lib/genreAdmin";
import { detectVideoQuality } from "@/lib/qualityDetection";

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
    is_adult: false,
    content_type: "movie",
    quality: "Unknown",
    quality_notes: "",
    coming_soon: false,
    release_date: "",
    is_for_sale: false,
    price: "",
    download_url: "",
    intro_start: "",
    intro_end: "",
    recap_start: "",
    recap_end: "",
    subtitles: [],
    main_cast: "",
    guest_stars: "",
    director_or_creator: "",
    age_rating: "",
    runtime_or_episodes: "",
    genres: [],
    season_number: "",
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
    const seriesId = form.series_id?.trim() || undefined;
    
    let finalQuality = form.quality;
    if (finalQuality === "Unknown" && form.video_url) {
      const toastId = toast.loading("Auto-detecting video quality...");
      finalQuality = await detectVideoQuality(form.video_url, form.title);
      toast.success(`Quality detected as ${finalQuality}`, { id: toastId });
    }

    const payload = {
      ...form,
      quality: finalQuality,
      quality_notes: form.quality_notes || undefined,
      episode_number: seriesId ? (form.episode_number ? Number(form.episode_number) : undefined) : undefined,
      season_number: seriesId ? (form.season_number ? Number(form.season_number) : undefined) : undefined,
      series_id: seriesId,
      franchise_id: form.franchise_id || undefined,
      // Auto-correct content_type based on series assignment
      content_type: seriesId ? "episode" : "movie",
      quality: form.quality,
      is_for_sale: form.is_for_sale,
      price: form.price ? Number(form.price) : undefined,
      download_url: form.download_url || undefined,
      intro_start: form.intro_start !== "" ? Number(form.intro_start) : undefined,
      intro_end: form.intro_end !== "" ? Number(form.intro_end) : undefined,
      recap_start: form.recap_start !== "" ? Number(form.recap_start) : undefined,
      recap_end: form.recap_end !== "" ? Number(form.recap_end) : undefined,
      subtitles: form.subtitles.filter(s => s.url.trim() !== ""),
      main_cast: form.main_cast ? form.main_cast.split(",").map(s => s.trim()).filter(Boolean) : [],
      guest_stars: form.guest_stars ? form.guest_stars.split(",").map(s => s.trim()).filter(Boolean) : [],
      director_or_creator: form.director_or_creator || undefined,
      age_rating: form.age_rating || undefined,
      runtime_or_episodes: form.runtime_or_episodes || undefined,
      genres: form.genres || [],
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
      is_adult: false,
      content_type: "movie",
      quality: "Unknown",
      quality_notes: "",
      coming_soon: false,
      release_date: "",
      is_for_sale: false,
      price: "",
      download_url: "",
      intro_start: "",
      intro_end: "",
      recap_start: "",
      recap_end: "",
      subtitles: [],
      main_cast: "",
      guest_stars: "",
      director_or_creator: "",
      age_rating: "",
      runtime_or_episodes: "",
      genres: [],
      season_number: "",
    });
    onSuccess?.();
  };

  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [fetchingAi, setFetchingAi] = useState(false);
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
    setFetchingAi(true);
    try {
      const type = form.series_id ? "episode" : "movie";
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
    setFetchingAi(false);
  };

  const [fetchingGemini, setFetchingGemini] = useState(false);

  const handleGeminiFetch = async () => {
    if (!form.title) { toast.error("Please fill the title first"); return; }
    setFetchingGemini(true);
    try {
      const type = form.series_id ? "episode" : "movie";
      const seriesName = seriesList?.find((s) => s.id === form.series_id)?.title;
      const res = await base44.functions.invoke("fetchGeminiMetadata", {
        title: form.title,
        content_type: type === "episode" ? "tv" : "movie",
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

  useEffect(() => {
    if (form.video_url && !form.title) {
      try {
        const link = form.video_url;
        const filename = decodeURIComponent(link.split('/').pop().split('?')[0]);
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
        let episodeNumber = null;
        let seasonNumber = null;

        // Try S##E## pattern first (captures both season and episode)
        const sxxexxMatch = nameWithoutExt.match(/[Ss](\d+)[Ee](\d+)/);
        if (sxxexxMatch) {
          seasonNumber = parseInt(sxxexxMatch[1], 10);
          episodeNumber = parseInt(sxxexxMatch[2], 10);
        }

        if (!episodeNumber) {
          const patterns = [
            /[Ee]p(?:isode)?[-_\s]?(\d+)/i,
            /[-_](\d+)[-_]?$/,
            /[\s._-](\d+)[\s._-]/,
            /^(\d+)[\s._-]/,
            /(\d+)$/,
          ];

          for (const pattern of patterns) {
            const m = (nameWithoutExt + ' ' + link).match(pattern);
            if (m) {
              episodeNumber = parseInt(m[1], 10);
              break;
            }
          }
        }

        let title = nameWithoutExt
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        title = title.replace(/\b\w/g, c => c.toUpperCase());

        setForm(prev => ({
          ...prev,
          title: prev.title || title,
          episode_number: prev.content_type === "movie" || !prev.series_id 
            ? prev.episode_number 
            : (prev.episode_number || (episodeNumber ? String(episodeNumber) : prev.episode_number)),
          season_number: prev.content_type === "movie" || !prev.series_id
            ? prev.season_number
            : (prev.season_number || (seasonNumber ? String(seasonNumber) : prev.season_number))
        }));
      } catch (e) {}
    }
  }, [form.video_url]);

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
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAiFetch}
            disabled={fetchingAi}
            className="text-xs gap-1.5 text-primary hover:text-primary/80 h-7"
          >
            {fetchingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {fetchingAi ? "Searching..." : "AI Auto-Fill"}
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
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What's this video about? Or use AI Auto-Fill →"
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

      <SeriesSearchSelect
        seriesList={seriesList}
        value={form.series_id}
        onChange={(id) => setForm(prev => ({
          ...prev,
          series_id: id,
          content_type: id ? "episode" : "movie",
        }))}
        label="Series"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Season #</Label>
          <Input
            type="number"
            value={form.season_number}
            onChange={(e) => update("season_number", e.target.value)}
            placeholder="Auto-detected from filename"
            className="bg-secondary border-border"
          />
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

      <GenreSelect value={form.genres} onChange={(arr) => update("genres", arr)} label="Genres" aiDetected={!!form.genres.length} />

      {franchises.length > 0 && (
        <FranchiseSearchSelect franchises={franchises} value={form.franchise_id} onChange={(id) => update("franchise_id", id)} />
      )}

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

      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          value={form.duration}
          onChange={(e) => update("duration", e.target.value)}
          placeholder="e.g. 24:30"
          className="bg-secondary border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg">
        <div className="space-y-2">
          <Label>Intro Start (sec)</Label>
          <Input type="number" value={form.intro_start} onChange={(e) => update("intro_start", e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Intro End (sec)</Label>
          <Input type="number" value={form.intro_end} onChange={(e) => update("intro_end", e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Recap Start (sec)</Label>
          <Input type="number" value={form.recap_start} onChange={(e) => update("recap_start", e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Recap End (sec)</Label>
          <Input type="number" value={form.recap_end} onChange={(e) => update("recap_end", e.target.value)} className="bg-secondary border-border" />
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>Quality Notes</Label>
          <Input value={form.quality_notes} onChange={(e) => update("quality_notes", e.target.value)} className="bg-secondary border-border" placeholder="e.g. Chinese Subs, Hardcoded" />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <Switch checked={form.coming_soon} onCheckedChange={(v) => update("coming_soon", v)} />
        <div className="flex-1">
          <Label className="text-amber-400 font-semibold">Coming Soon</Label>
          <p className="text-xs text-muted-foreground">Add title/description now, add video file later</p>
        </div>
      </div>
      {form.coming_soon && (
        <div className="space-y-2">
          <Label>Release Date</Label>
          <Input type="date" value={form.release_date} onChange={(e) => update("release_date", e.target.value)} className="bg-secondary border-border" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_featured}
          onCheckedChange={(v) => update("is_featured", v)}
        />
        <Label>Featured on homepage hero</Label>
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

      <div className="flex items-center gap-3 p-3 bg-secondary border border-border rounded-lg">
        <Switch checked={form.is_for_sale} onCheckedChange={(v) => update("is_for_sale", v)} />
        <div>
          <Label className="font-semibold">Available for Download Purchase</Label>
          <p className="text-xs text-muted-foreground">Users can buy this to download it</p>
        </div>
      </div>
      {form.is_for_sale && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Price ($)</Label>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Download URL</Label>
            <Input value={form.download_url} onChange={(e) => update("download_url", e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 font-bold"
        disabled={!form.title || (!form.video_url && !form.coming_soon) || uploading}
      >
        Add Video
      </Button>
    </form>
  );
}