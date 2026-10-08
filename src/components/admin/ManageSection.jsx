import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Film, Video, ChevronDown, ChevronRight, Pencil, Trash2, ImageIcon, Loader2, Play, Search, Eye, RefreshCw, Tags } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ensureVideoCategory, enumToGenre, genreToEnum, normaliseToGenre, resolveVideoGenre } from "@/lib/genreAdmin";

import { Layers } from "lucide-react";

export default function ManageSection({
  videos,
  seriesList,
  franchises = [],
  categories = [],
  loadingVideos,
  loadingSeries,
  fetchingPosterFor,
  onEditVideo,
  onDeleteVideo,
  onEditSeries,
  onDeleteSeries,
  onEditFranchise,
  onDeleteFranchise,
  onFetchPoster,
}) {
  const [franchisesOpen, setFranchisesOpen] = useState(true);
  const [seriesOpen, setSeriesOpen] = useState(true);
  const [videosOpen, setVideosOpen] = useState(true);
  const [franchiseSearch, setFranchiseSearch] = useState("");
  const [seriesSearch, setSeriesSearch] = useState("");
  const [videosSearch, setVideosSearch] = useState("");
  const [detectingQualities, setDetectingQualities] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectingGenres, setDetectingGenres] = useState(false);
  const [genreProgress, setGenreProgress] = useState(0);

  const handleAutoDetectGenres = async (e) => {
    e.stopPropagation();
    if (!confirm("This will use AI to detect a genre for every movie and series that currently has none set, and save it. Existing genres are left untouched. Continue?")) return;
    setDetectingGenres(true);
    setGenreProgress(0);
    let count = 0;
    let index = 0;
    const totalMovies = videos.filter((v) => v.content_type !== "episode" && !v.category_id).length;
    const totalSeries = seriesList.filter((s) => !s.category).length;
    const total = totalMovies + totalSeries;
    for (const v of videos) {
      if (v.content_type === "episode" || v.category_id) continue;
      index++;
      setGenreProgress(Math.round((index / Math.max(total, 1)) * 100));
      try {
        const res = await base44.functions.invoke("aiMediaInfo", { title: v.title, type: "movie" });
        const genre = normaliseToGenre(res.data?.genre);
        if (genre) {
          const categoryId = await ensureVideoCategory(genre);
          if (categoryId) { await base44.entities.Video.update(v.id, { category_id: categoryId }); count++; }
        }
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) { console.error(err); }
    }
    for (const s of seriesList) {
      if (s.category) continue;
      index++;
      setGenreProgress(Math.round((index / Math.max(total, 1)) * 100));
      try {
        const res = await base44.functions.invoke("aiMediaInfo", { title: s.title, type: "tv" });
        const genre = normaliseToGenre(res.data?.genre);
        if (genre) { await base44.entities.Series.update(s.id, { category: genreToEnum(genre) }); count++; }
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) { console.error(err); }
    }
    setDetectingGenres(false);
    alert(`Updated genres for ${count} item${count !== 1 ? "s" : ""}! Please refresh the page to see changes.`);
  };

  const handleAutoDetectQualities = async (e) => {
    e.stopPropagation();
    if (!confirm("This will scan all videos and assign quality (HD, Full HD, etc.) based on titles/URLs. Continue?")) return;
    
    setDetectingQualities(true);
    setDetectProgress(0);
    let count = 0;
    let index = 0;
    
    for (const v of videos) {
      index++;
      setDetectProgress(Math.round((index / videos.length) * 100));
      
      if (v.quality && v.quality !== "Unknown") continue;

      const text = `${v.title || ''} ${v.video_url || ''} ${v.description || ''}`.toLowerCase();
      let q = "Unknown";
      
      if (text.includes("4k") || text.includes("2160") || text.includes("uhd")) q = "4K";
      else if (text.includes("1080") || text.includes("full hd") || text.includes("fhd")) q = "Full HD";
      else if (text.includes("720") || text.includes(" hd") || text.includes("hd ") || text.endsWith("hd")) q = "HD";
      else if (text.includes("cam") || text.includes("ts") || text.includes("telesync") || text.includes("hdcam")) q = "CAM";
      
      if (q !== "Unknown") {
        try {
          await base44.entities.Video.update(v.id, { quality: q });
          count++;
          // Small delay to prevent hitting API rate limits from the browser
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(err);
        }
      }
    }
    
    setDetectingQualities(false);
    alert(`Updated ${count} videos! Please refresh the page to see changes.`);
  };

  const filteredFranchises = franchises.filter((f) =>
    f.title?.toLowerCase().includes(franchiseSearch.toLowerCase())
  );

  const filteredSeries = seriesList.filter((s) =>
    s.title?.toLowerCase().includes(seriesSearch.toLowerCase())
  );

  const filteredVideos = videos.filter((v) => {
    const q = videosSearch.toLowerCase();
    const series = seriesList.find((s) => s.id === v.series_id);
    return (
      v.title?.toLowerCase().includes(q) ||
      series?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Franchises Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
          onClick={() => setFranchisesOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Layers className="w-4 h-4" />
            Franchises
            <Badge variant="secondary" className="ml-1 text-xs">{franchises.length}</Badge>
          </div>
          {franchisesOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {franchisesOpen && (
          <div className="px-5 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={franchiseSearch}
                onChange={(e) => setFranchiseSearch(e.target.value)}
                placeholder="Search franchises..."
                className="bg-secondary border-border pl-8 h-8 text-sm"
              />
            </div>

            {filteredFranchises.length === 0 ? (
              <p className="text-muted-foreground text-sm">No franchises found.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredFranchises.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {f.cover_image && (
                        <img src={f.cover_image} alt="" className="w-12 h-8 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{f.title}</p>
                        {f.parent_id && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sub-franchise
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {f.views || 0} views
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onEditFranchise(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteFranchise(f.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Series Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
          onClick={() => setSeriesOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Film className="w-4 h-4" />
            Series
            <Badge variant="secondary" className="ml-1 text-xs">{seriesList.length}</Badge>
          </div>
          {seriesOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {seriesOpen && (
          <div className="px-5 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="Search series..."
                className="bg-secondary border-border pl-8 h-8 text-sm"
              />
            </div>

            {loadingSeries ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : filteredSeries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No series found.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredSeries.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {s.cover_image && (
                        <img src={s.cover_image} alt="" className="w-12 h-8 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{s.title}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {s.category && <Badge variant="outline" className="text-xs capitalize">{enumToGenre(s.category)}</Badge>}
                          {!s.category && <Badge variant="outline" className="text-xs text-muted-foreground">No genre</Badge>}
                          {s.is_adult && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">18+</Badge>}
                          <Badge variant="outline" className="text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {s.views || 0}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onEditSeries(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteSeries(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
          onClick={() => setVideosOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Video className="w-4 h-4" />
            Videos
            <Badge variant="secondary" className="ml-1 text-xs">{videos.length}</Badge>
            
            {detectingQualities && (
              <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                Scanning... {detectProgress}%
              </Badge>
            )}
            {detectingGenres && (
              <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                Detecting genres... {genreProgress}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleAutoDetectGenres}
              disabled={detectingGenres}
            >
              {detectingGenres ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Tags className="w-3 h-3 mr-1" />}
              Auto-detect Genres
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleAutoDetectQualities}
              disabled={detectingQualities}
            >
              {detectingQualities ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Auto-detect Qualities
            </Button>
            {videosOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {videosOpen && (
          <div className="px-5 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={videosSearch}
                onChange={(e) => setVideosSearch(e.target.value)}
                placeholder="Search videos or series..."
                className="bg-secondary border-border pl-8 h-8 text-sm"
              />
            </div>

            {loadingVideos ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : filteredVideos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No videos found.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredVideos.map((v) => {
                  const series = seriesList.find((s) => s.id === v.series_id);
                  return (
                    <div key={v.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-16 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                          {v.thumbnail_url ? (
                            <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{v.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {series && <span className="text-xs text-primary">{series.title}</span>}
                            {v.episode_number && <span className="text-xs text-muted-foreground">EP {v.episode_number}</span>}
                            {v.content_type === "movie" && <Badge className="text-xs bg-blue-500/20 text-blue-400">Movie</Badge>}
                            {v.content_type === "movie" && (resolveVideoGenre(v, categories) ? <Badge variant="outline" className="text-xs">{resolveVideoGenre(v, categories)}</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">No genre</Badge>)}
                            {v.is_featured && <Badge className="text-xs bg-primary/20 text-primary">Featured</Badge>}
                            {v.is_adult && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">18+</Badge>}
                            <Badge variant="outline" className="text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views || 0}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-yellow-400"
                          title="Auto-fetch poster"
                          onClick={() => onFetchPoster(v)}
                          disabled={fetchingPosterFor === v.id}
                        >
                          {fetchingPosterFor === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onEditVideo(v)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteVideo(v.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}