import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import { Loader2, Film, Tv } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const isLoading = loadingVideos || loadingSeries;

  // Latest 5 for hero banner
  const heroVideos = videos.slice(0, 5);

  // Movies (standalone, not in any series)
  const movies = videos.filter(
    (v) => v.content_type === "movie" || (!v.series_id && !v.content_type)
  );

  // Series that have episodes, sorted A-Z
  const seriesWithEpisodes = seriesList
    .filter((s) => videos.some((v) => v.series_id === s.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const episodeCountBySeries = (seriesId) =>
    videos.filter((v) => v.series_id === seriesId).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Film className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No videos yet</h2>
          <p className="text-muted-foreground">Content is coming soon. Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero: latest 5 videos */}
      <HeroSection videos={heroVideos} seriesList={seriesList} />

      {/* Tabs */}
      <div className="relative z-10 -mt-6 px-6 md:px-16 mb-8">
        <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md border border-border rounded-full p-1 w-fit">
          {[
            { id: "all", label: "All", icon: null },
            { id: "movies", label: "Movies", icon: Film },
            { id: "tv", label: "TV Series", icon: Tv },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 pb-16 px-6 md:px-16">

        {/* TV Series Grid */}
        {(activeTab === "all" || activeTab === "tv") && seriesWithEpisodes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4">TV Series</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {seriesWithEpisodes.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  episodeCount={episodeCountBySeries(series.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Movies Grid */}
        {(activeTab === "all" || activeTab === "movies") && movies.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4">Movies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {movies.map((movie) => (
                <VideoCard key={movie.id} video={movie} />
              ))}
            </div>
          </div>
        )}

        {/* Empty states */}
        {activeTab === "tv" && seriesWithEpisodes.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No TV series yet.</div>
        )}
        {activeTab === "movies" && movies.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No movies yet.</div>
        )}
      </div>
    </div>
  );
}