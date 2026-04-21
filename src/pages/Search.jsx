import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowLeft, Film, Tv } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";

export default function Search() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(urlParams.get("q") || "");

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const episodeCount = (seriesId) => videos.filter((v) => v.series_id === seriesId).length;

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { videos: [], series: [] };
    return {
      videos: videos.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
      ),
      series: seriesList.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      ),
    };
  }, [query, videos, seriesList]);

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

        <div className="relative max-w-2xl mb-10">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            className="pl-10 h-12 text-base bg-card border-border"
          />
        </div>

        {query.trim() === "" && (
          <p className="text-muted-foreground">Start typing to search...</p>
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