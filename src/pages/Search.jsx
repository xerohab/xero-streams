import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowLeft, Film, Tv, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";

export default function Search() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(urlParams.get("q") || "");
  const [filterType, setFilterType] = useState("all"); // 'all', 'movies', 'series'
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [filterCast, setFilterCast] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["video_categories"],
    queryFn: () => base44.entities.VideoCategory.list(),
  });

  const episodeCount = (seriesId) => videos.filter((v) => v.series_id === seriesId).length;

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    let filteredVideos = videos;
    let filteredSeries = seriesList;

    if (q) {
      filteredVideos = filteredVideos.filter(
        (v) => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)
      );
      filteredSeries = filteredSeries.filter(
        (s) => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }

    if (filterCategory !== "all") {
      filteredVideos = filteredVideos.filter(v => v.category_id === filterCategory);
      filteredSeries = filteredSeries.filter(s => s.category === filterCategory); // Series has enum category
    }

    if (filterYear) {
      filteredVideos = filteredVideos.filter(v => 
        (v.release_year && v.release_year.toString() === filterYear) || 
        (v.release_date && v.release_date.startsWith(filterYear))
      );
      filteredSeries = filteredSeries.filter(s => s.release_year && s.release_year.toString() === filterYear);
    }

    if (filterCast) {
      const c = filterCast.toLowerCase().trim();
      filteredVideos = filteredVideos.filter(v => v.cast?.toLowerCase().includes(c));
      filteredSeries = filteredSeries.filter(s => s.cast?.toLowerCase().includes(c));
    }

    if (filterType === "movies") filteredSeries = [];
    if (filterType === "series") filteredVideos = [];

    // Only return empty if no query AND no filters are applied
    if (!q && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast) {
      return { videos: [], series: [] };
    }

    return { videos: filteredVideos, series: filteredSeries };
  }, [query, videos, seriesList, filterType, filterCategory, filterYear, filterCast]);

  const hasResults = results.videos.length > 0 || results.series.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 md:px-16 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col gap-4 max-w-4xl mb-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-[2]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, TV shows..."
                className="pl-10 h-12 text-base bg-card border-border w-full"
              />
            </div>
            <div className="flex flex-1 gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-12 flex-1 px-4 rounded-md border border-input bg-card text-foreground"
              >
                <option value="all">All Types</option>
                <option value="movies">Movies</option>
                <option value="series">TV Series</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-12 flex-1 px-4 rounded-md border border-input bg-card text-foreground"
              >
                <option value="all">All Genres</option>
                <option value="action">Action</option>
                <option value="comedy">Comedy</option>
                <option value="drama">Drama</option>
                <option value="documentary">Documentary</option>
                <option value="horror">Horror</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="thriller">Thriller</option>
                <option value="education">Education</option>
                <option value="music">Music</option>
                <option value="crime">Crime</option>
                <option value="mystery">Mystery</option>
                <option value="fantasy">Fantasy</option>
                <option value="romance">Romance</option>
                <option value="animation">Animation</option>
                <option value="adventure">Adventure</option>
                <option value="other">Other</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setShowAdvanced(!showAdvanced);
                  base44.analytics.track({ eventName: "advanced_search_toggled", properties: { open: !showAdvanced } });
                }}
                className={`h-12 w-12 flex items-center justify-center rounded-md border transition-colors ${showAdvanced ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="flex flex-col md:flex-row gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
              <Input
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                placeholder="Release Year (e.g. 2023)"
                className="flex-1 h-12 text-base bg-card border-border"
                type="number"
              />
              <Input
                value={filterCast}
                onChange={(e) => setFilterCast(e.target.value)}
                placeholder="Search by Cast Member"
                className="flex-[2] h-12 text-base bg-card border-border"
              />
            </div>
          )}
        </div>

        {!hasResults && !query && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast && (
          <p className="text-muted-foreground">Start typing or use filters to search...</p>
        )}

        {query.trim() !== "" && !hasResults && (
          <p className="text-muted-foreground">No results found for "<strong>{query}</strong>"</p>
        )}

        {results.series.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" /> TV Series
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.series.map((s) => (
                <SeriesCard key={s.id} series={s} episodeCount={episodeCount(s.id)} />
              ))}
            </div>
          </div>
        )}

        {results.videos.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Movies & Episodes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}