import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoRow from "@/components/browse/VideoRow";
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

  // Filter by tab
  const movies = videos.filter((v) => v.content_type === "movie" || (!v.content_type && !v.series_id));
  const tvEpisodes = videos.filter((v) => v.content_type === "episode" || (v.series_id && v.content_type !== "movie"));

  const activeVideos = activeTab === "movies" ? movies : activeTab === "tv" ? tvEpisodes : videos;

  // Featured video
  const featuredVideo = activeVideos.find((v) => v.is_featured) || activeVideos[0];
  const featuredSeriesTitle = featuredVideo?.series_id
    ? seriesList.find((s) => s.id === featuredVideo.series_id)?.title
    : null;

  // Series rows (only for TV tab or All)
  const seriesRows = seriesList
    .map((series) => ({
      title: series.title,
      videos: activeVideos
        .filter((v) => v.series_id === series.id)
        .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0)),
    }))
    .filter((row) => row.videos.length > 0);

  // Standalone movies (not in a series)
  const standaloneMovies = activeVideos.filter(
    (v) => !v.series_id || !seriesList.some((s) => s.id === v.series_id)
  );

  // Recently added (all active)
  const recentVideos = [...activeVideos].slice(0, 15);

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

      <HeroSection video={featuredVideo} seriesTitle={featuredSeriesTitle} />

      {/* Category Tabs */}
      <div className="relative z-10 -mt-6 px-6 md:px-16 mb-4">
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

      <div className="relative z-10 pb-16">
        {activeTab === "movies" ? (
          <>
            {standaloneMovies.length > 0 && (
              <VideoRow title="Movies" videos={standaloneMovies} />
            )}
            {standaloneMovies.length === 0 && (
              <div className="text-center py-16 text-muted-foreground px-6">
                No movies yet. Add some from the admin panel.
              </div>
            )}
          </>
        ) : activeTab === "tv" ? (
          <>
            {seriesRows.length > 0 ? seriesRows.map((row) => (
              <VideoRow key={row.title} title={row.title} videos={row.videos} />
            )) : (
              <div className="text-center py-16 text-muted-foreground px-6">
                No TV series yet. Add some from the admin panel.
              </div>
            )}
          </>
        ) : (
          <>
            {recentVideos.length > 0 && (
              <VideoRow title="Recently Added" videos={recentVideos} />
            )}
            {seriesRows.map((row) => (
              <VideoRow key={row.title} title={row.title} videos={row.videos} />
            ))}
            {standaloneMovies.length > 0 && (
              <VideoRow title="Movies" videos={standaloneMovies} />
            )}
          </>
        )}
      </div>
    </div>
  );
}