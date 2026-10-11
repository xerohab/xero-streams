import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, Link as LinkIcon, Loader2, CheckCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { detectVideoQuality } from "@/lib/qualityDetection";
import GenreSelect from "@/components/admin/GenreSelect";
import { fetchMediaAutoFill, mediaInfoUpdates } from "@/lib/mediaAutoFill";

const emptyEpisode = () => ({
  title: "",
  description: "",
  video_url: "",
  thumbnail_url: "",
  episode_number: "", season_number: "",
  duration: "",
  quality: "Unknown",
  quality_notes: "",
  genres: [],
  uploading: false,
  uploaded: false,
  coming_soon: false,
  release_date: "",
});

export default function BulkEpisodeUpload({ seriesList, isMovieMode = false, onSuccess }) {
  const [selectedSeries, setSelectedSeries] = useState("");
  const [episodes, setEpisodes] = useState([{ ...emptyEpisode(), episode_number: isMovieMode ? "" : "1" }]);
  const [saving, setSaving] = useState(false);
  const [sourceTab, setSourceTab] = useState("link");
  const [fetchingAiFor, setFetchingAiFor] = useState(null);
  const [fetchingAiAll, setFetchingAiAll] = useState(false);
  const [seriesGenres, setSeriesGenres] = useState([]);

  const updateEp = (index, field, value) => {
    setEpisodes((prev) => prev.map((ep, i) => i === index ? { ...ep, [field]: value } : ep));
  };

  const addEpisode = () => {
    setEpisodes((prev) => {
      const lastEp = prev[prev.length - 1];
      const nextNum = lastEp?.episode_number ? Number(lastEp.episode_number) + 1 : prev.length + 1;
      return [...prev, { ...emptyEpisode(), episode_number: String(nextNum) }];
    });
  };
  const removeEpisode = (index) => setEpisodes((prev) => prev.filter((_, i) => i !== index));

  const handleAiFetch = async (index) => {
    const ep = episodes[index];
    setFetchingAiFor(index);
    try {
      const type = isMovieMode ? "movie" : "episode";
      const seriesName = isMovieMode ? undefined : seriesList?.find(s => s.id === selectedSeries)?.title;
      const res = await fetchMediaAutoFill({
        title: ep.title || "",
        videoUrl: ep.video_url,
        type,
        seriesName,
        episodeNumber: isMovieMode ? undefined : ep.episode_number,
        seasonNumber: isMovieMode ? undefined : ep.season_number,
      });
      if (res.data?.title || res.data?.description || res.data?.genres?.length) {
        setEpisodes(prev => prev.map((current, i) => i === index ? { ...current, ...mediaInfoUpdates(res.data) } : current));
        toast.success("AI info applied!");
      } else {
        toast.error("Couldn't find info for that title");
      }
    } catch (e) {
      toast.error(e.message || "AI info failed");
    }
    setFetchingAiFor(null);
  };

  const handleAiFetchAll = async () => {
    setFetchingAiAll(true);
    const type = isMovieMode ? "movie" : "episode";
    const seriesName = isMovieMode ? undefined : seriesList?.find(s => s.id === selectedSeries)?.title;

    const results = await Promise.allSettled(
      episodes.map((ep, i) =>
        fetchMediaAutoFill({
          title: ep.title || "",
          videoUrl: ep.video_url,
          type,
          seriesName,
          episodeNumber: isMovieMode ? undefined : ep.episode_number,
          seasonNumber: isMovieMode ? undefined : ep.season_number,
        }).then(res => ({ index: i, data: res.data }))
      )
    );

    setEpisodes(prev => {
      const updated = [...prev];
      results.forEach(result => {
        if (result.status === "fulfilled" && result.value?.data) {
          const { index, data } = result.value;
          updated[index] = {
            ...updated[index],
            ...mediaInfoUpdates(data),
          };
        }
      });
      return updated;
    });
    setFetchingAiAll(false);
    const applied = results.filter(result => result.status === "fulfilled").length;
    if (applied) toast.success(`AI info applied to ${applied} item${applied === 1 ? "" : "s"}!`);
    const failure = results.find(result => result.status === "rejected");
    if (failure) toast.error(failure.reason?.message || "Some items could not be identified and were left unchanged.");
  };

  const handleVideoFileUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    updateEp(index, "uploading", true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEpisodes((prev) => prev.map((ep, i) => i === index ? { ...ep, video_url: file_url, uploading: false, uploaded: true } : ep));
  };

  const handleThumbUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateEp(index, "thumbnail_url", file_url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMovieMode && !selectedSeries) { toast.error("Please select a series"); return; }
    const valid = episodes.filter((ep) => ep.title && (ep.video_url || ep.coming_soon));
    if (valid.length === 0) { toast.error("Add at least one item with a title and video (or Coming Soon)"); return; }
    setSaving(true);
    const toastId = toast.loading("Processing & auto-detecting qualities...");
    const seriesCover = !isMovieMode ? seriesList?.find((s) => s.id === selectedSeries)?.cover_image : undefined;

    const records = [];

    for (const ep of valid) {
      let finalQuality = ep.quality;
      if (finalQuality === "Unknown" && ep.video_url && !ep.coming_soon) {
        finalQuality = await detectVideoQuality(ep.video_url, ep.title);
      }

      records.push({
        title: ep.title,
        description: ep.description || undefined,
        video_url: ep.coming_soon ? "" : ep.video_url,
        thumbnail_url: ep.thumbnail_url || seriesCover || undefined,
        series_id: isMovieMode ? undefined : selectedSeries,
        episode_number: (!isMovieMode && ep.episode_number) ? Number(ep.episode_number) : undefined,
        season_number: (!isMovieMode && ep.season_number) ? Number(ep.season_number) : undefined,
        duration: ep.duration || undefined,
        content_type: isMovieMode ? "movie" : "episode",
        is_featured: false,
        quality: finalQuality,
        quality_notes: ep.quality_notes || undefined,
        coming_soon: ep.coming_soon,
        release_date: ep.release_date || undefined,
        genres: ep.genres.length ? ep.genres : undefined,
      });
    }

    // TV mode: update the selected series' genre if the admin chose one.
    if (!isMovieMode && selectedSeries && seriesGenres.length) {
      const current = seriesList?.find((s) => s.id === selectedSeries);
      if (current && JSON.stringify(current.genres || []) !== JSON.stringify(seriesGenres)) {
        await base44.entities.Series.update(selectedSeries, { genres: seriesGenres, content_updated_at: new Date().toISOString() });
      }
    }

    await base44.entities.Video.bulkCreate(records);
    toast.success(`${records.length} ${isMovieMode ? "movie" : "episode"}${records.length > 1 ? "s" : ""} added!`, { id: toastId });
    setEpisodes([emptyEpisode()]);
    setSelectedSeries("");
    setSeriesGenres([]);
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isMovieMode && (
        <div className="space-y-2">
          <Label>Series *</Label>
          <Select value={selectedSeries} onValueChange={(id) => { setSelectedSeries(id); const s = seriesList?.find((x) => x.id === id); setSeriesGenres(s?.genres?.length ? s.genres : []); }}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select a series to add episodes to" />
            </SelectTrigger>
            <SelectContent>
              {seriesList?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSeries && (
            <GenreSelect value={seriesGenres} onChange={setSeriesGenres} label="Series Genres (applied on import)" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Label>Video Source Mode</Label>
          <Tabs value={sourceTab} onValueChange={setSourceTab} className="w-full">
            <TabsList className="bg-secondary">
              <TabsTrigger value="link" className="gap-2"><LinkIcon className="w-4 h-4" /> Links</TabsTrigger>
              <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4" /> Upload Files</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAiFetchAll}
          disabled={fetchingAiAll || (!isMovieMode && !selectedSeries)}
          className="gap-2 h-9 mt-6"
        >
          {fetchingAiAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Auto-Fill All
        </Button>
      </div>

      <div className="space-y-4">
        {episodes.map((ep, index) => (
          <div key={index} className="bg-secondary/50 border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Episode {index + 1}</span>
              {episodes.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={() => removeEpisode(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <div className="flex items-center gap-1">
                  <Input value={ep.title} onChange={(e) => updateEp(index, "title", e.target.value)} placeholder={isMovieMode ? "Movie title" : "Episode title"} className="bg-secondary border-border h-9 flex-1" required />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-primary hover:text-primary/80"
                    title="AI Auto-Fill"
                    disabled={fetchingAiFor === index || (!isMovieMode && !selectedSeries)}
                    onClick={() => handleAiFetch(index)}
                  >
                    {fetchingAiFor === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {!isMovieMode && (
                <div className="space-y-1">
                  <Label className="text-xs">Episode #</Label>
                  <Input type="number" value={ep.episode_number} onChange={(e) => updateEp(index, "episode_number", e.target.value)} placeholder="1" className="bg-secondary border-border h-9" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={ep.description} onChange={(e) => updateEp(index, "description", e.target.value)} placeholder="Optional description" className="bg-secondary border-border h-16 text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Video {sourceTab === "upload" ? "File" : "URL"} {!ep.coming_soon && "*"}</Label>
                {sourceTab === "link" ? (
                  <Input value={ep.video_url} onChange={(e) => updateEp(index, "video_url", e.target.value)} placeholder="https://..." className="bg-secondary border-border h-9" />
                ) : (
                  <div className="relative border-2 border-dashed border-border rounded-md p-3 text-center hover:border-primary/50 transition-colors">
                    {ep.uploading ? (
                      <span className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                    ) : ep.uploaded || ep.video_url ? (
                      <span className="text-xs text-green-400 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Uploaded</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Click to upload video</span>
                    )}
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFileUpload(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Thumbnail</Label>
                <div className="flex gap-2">
                  <Input value={ep.thumbnail_url} onChange={(e) => updateEp(index, "thumbnail_url", e.target.value)} placeholder="URL or upload" className="bg-secondary border-border h-9 flex-1" />
                  <Button type="button" variant="secondary" size="icon" className="h-9 w-9 relative overflow-hidden flex-shrink-0">
                    <Upload className="w-3 h-3" />
                    <input type="file" accept="image/*" onChange={(e) => handleThumbUpload(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration</Label>
                <Input value={ep.duration} onChange={(e) => updateEp(index, "duration", e.target.value)} placeholder="e.g. 24:30" className="bg-secondary border-border h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quality</Label>
                <div className="flex gap-2">
                  <Select value={ep.quality || "Unknown"} onValueChange={(v) => updateEp(index, "quality", v)}>
                    <SelectTrigger className="bg-secondary border-border h-9 w-32 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unknown">Auto Detect</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                      <SelectItem value="Full HD">Full HD</SelectItem>
                      <SelectItem value="HD">HD</SelectItem>
                      <SelectItem value="CAM">CAM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={ep.quality_notes || ""} onChange={(e) => updateEp(index, "quality_notes", e.target.value)} placeholder="Notes (e.g. HC Subs)" className="bg-secondary border-border h-9 flex-1" />
                </div>
              </div>
            </div>

            {isMovieMode && (
              <GenreSelect value={ep.genres} onChange={(arr) => updateEp(index, "genres", arr)} label="Genres" aiDetected={!!ep.genres.length} />
            )}

            <div className="flex flex-col gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <Switch checked={ep.coming_soon} onCheckedChange={(v) => updateEp(index, "coming_soon", v)} />
                <Label className="text-xs text-amber-400 font-semibold">Coming Soon</Label>
              </div>
              {ep.coming_soon && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0 text-amber-400/80">Release Date</Label>
                  <Input type="date" value={ep.release_date || ""} onChange={(e) => updateEp(index, "release_date", e.target.value)} className="bg-secondary border-border h-8 text-xs max-w-[150px]" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addEpisode} className="w-full border-dashed border-border gap-2">
        <Plus className="w-4 h-4" /> Add Another Episode
      </Button>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold" disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : `Save ${episodes.length} Episode${episodes.length > 1 ? "s" : ""}`}
      </Button>
    </form>
  );
}
