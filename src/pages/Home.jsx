import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import { Loader2, Film, Tv, ShieldAlert } from "lucide-react";
import ContinueWatchingRow from "@/components/browse/ContinueWatchingRow";

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
  });

  const isLoading = loadingVideos || loadingSeries;

  // Latest 5 for hero banner
  const heroVideos = videos.slice(0, 5);

  // Movies: anything that is not a series episode (no series_id, OR explicitly typed as movie)
  const movies = videos.filter(
    (v) => !v.series_id && (v.content_type === "movie" || v.content_type !== "episode")
  );

  // Franchises with content (check ALL videos with franchise_id, not just filtered movies)
  const franchisesWithContent = franchises
    .filter((f) => {
      const hasSeries = seriesList.some((s) => s.franchise_id === f.id);
      const hasVideos = videos.some((v) => v.franchise_id === f.id);
      return hasSeries || hasVideos;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const franchiseItemCount = (franchiseId) => {
    const seriesCount = seriesList.filter((s) => s.franchise_id === franchiseId).length;
    const videoCount = videos.filter((v) => v.franchise_id === franchiseId).length;
    return seriesCount + videoCount;
  };

  // Series that have episodes, sorted by sort_order then A-Z
  const seriesWithEpisodes = seriesList
    .filter((s) => videos.some((v) => v.series_id === s.id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const episodeCountBySeries = (seriesId) =>
    videos.filter((v) => v.series_id === seriesId).length;

  // Grouped series by franchise (for TV tab)
  const seriesByFranchise = franchisesWithContent
    .map((f) => ({
      franchise: f,
      series: seriesWithEpisodes.filter((s) => s.franchise_id === f.id),
    }))
    .filter((g) => g.series.length > 0);

  const ungroupedSeries = seriesWithEpisodes.filter((s) => !s.franchise_id);

  // Grouped movies by franchise (for Movies tab) — use ALL videos with franchise_id
  const moviesByFranchise = franchisesWithContent
    .map((f) => ({
      franchise: f,
      movies: videos.filter((v) => v.franchise_id === f.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }))
    .filter((g) => g.movies.length > 0);

  const ungroupedMovies = movies.filter((v) => !v.franchise_id);

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
        <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md border border-border rounded-full p-1 w-fit flex-wrap">
          {[
            { id: "all", label: "All", icon: null },
            { id: "movies", label: "Movies", icon: Film },
            { id: "tv", label: "TV Series", icon: Tv },
            ...(user?.age_verified ? [{ id: "adult", label: "Adult", icon: ShieldAlert }] : []),
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === id
                  ? id === "adult" ? "bg-red-600 text-white shadow-md" : "bg-primary text-primary-foreground shadow-md"
                  : id === "adult" ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 pb-16 px-6 md:px-16">
        <ContinueWatchingRow />

        {/* TV Series tab */}
        {(activeTab === "all" || activeTab === "tv") && (ungroupedSeries.length > 0 || seriesByFranchise.length > 0) && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" /> TV Series
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Franchise cards instead of individual series */}
              {seriesByFranchise.map(({ franchise, series }) => (
                <FranchiseCard key={franchise.id} franchise={franchise} itemCount={series.length} itemLabel="Series" />
              ))}
              {/* Standalone series not in any franchise */}
              {ungroupedSeries.map((s) => (
                <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Movies tab */}
        {(activeTab === "all" || activeTab === "movies") && (ungroupedMovies.length > 0 || moviesByFranchise.length > 0) && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Franchise cards instead of individual movies */}
              {moviesByFranchise.map(({ franchise, movies: fMovies }) => (
                <FranchiseCard key={franchise.id} franchise={franchise} itemCount={fMovies.length} itemLabel="Titles" />
              ))}
              {/* Standalone movies not in any franchise */}
              {ungroupedMovies.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}

        {/* Empty states */}
        {activeTab === "tv" && ungroupedSeries.length === 0 && seriesByFranchise.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No TV series yet.</div>
        )}
        {activeTab === "movies" && ungroupedMovies.length === 0 && moviesByFranchise.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No movies yet.</div>
        )}

        {/* Adult tab - only shown for age-verified users */}
        {activeTab === "adult" && user?.age_verified && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-bold text-foreground">Adult Content</h2>
              <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full font-semibold">18+</span>
            </div>
            <div className="bg-card border border-red-500/20 rounded-xl p-8 text-center">
              <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-foreground font-semibold mb-1">Adult Section</p>
              <p className="text-muted-foreground text-sm">Adult content will appear here once added by an admin. You are verified as 18+.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}