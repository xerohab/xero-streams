import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import { Loader2, Film, Tv, Layers } from "lucide-react";

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

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
  });

  const isLoading = loadingVideos || loadingSeries;

  // Latest 5 for hero banner
  const heroVideos = videos.slice(0, 5);

  // Movies (standalone, not in any series)
  const movies = videos.filter(
    (v) => v.content_type === "movie" || (!v.series_id && !v.content_type)
  );

  // Franchises with content
  const franchisesWithContent = franchises
    .filter((f) => {
      const hasSeries = seriesList.some((s) => s.franchise_id === f.id);
      const hasMovies = movies.some((v) => v.franchise_id === f.id);
      return hasSeries || hasMovies;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const franchiseItemCount = (franchiseId) => {
    const seriesCount = seriesList.filter((s) => s.franchise_id === franchiseId).length;
    const movieCount = movies.filter((v) => v.franchise_id === franchiseId).length;
    return seriesCount + movieCount;
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

  // Grouped movies by franchise (for Movies tab)
  const moviesByFranchise = franchisesWithContent
    .map((f) => ({
      franchise: f,
      movies: movies.filter((v) => v.franchise_id === f.id)
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

        {/* Franchises / Collections */}
        {(activeTab === "all") && franchisesWithContent.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Collections & Franchises
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Click a franchise to browse all its series and movies.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {franchisesWithContent.map((f) => (
                <FranchiseCard key={f.id} franchise={f} itemCount={franchiseItemCount(f.id)} />
              ))}
            </div>
          </div>
        )}

        {/* TV Series — with franchise grouping on tv tab */}
        {(activeTab === "all" || activeTab === "tv") && seriesWithEpisodes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" /> TV Series
            </h2>

            {activeTab === "tv" ? (
              <div className="space-y-10">
                {/* Franchise groups */}
                {seriesByFranchise.map(({ franchise, series }) => (
                  <div key={franchise.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      <h3 className="text-base font-bold text-foreground">{franchise.title}</h3>
                      <span className="text-xs text-muted-foreground">({series.length} series)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {series.map((s) => (
                        <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Ungrouped */}
                {ungroupedSeries.length > 0 && (
                  <div>
                    {seriesByFranchise.length > 0 && (
                      <h3 className="text-base font-bold text-foreground mb-3">Other Series</h3>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {ungroupedSeries.map((s) => (
                        <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All tab: flat grid, limit 15 */
              <>
                {seriesWithEpisodes.length > 15 && (
                  <p className="text-sm text-muted-foreground mb-4">Showing 15 of {seriesWithEpisodes.length} — <button onClick={() => setActiveTab("tv")} className="text-primary hover:underline font-medium">see all TV series</button></p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {seriesWithEpisodes.slice(0, 15).map((s) => (
                    <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Movies — with franchise grouping on movies tab */}
        {(activeTab === "all" || activeTab === "movies") && movies.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Movies
            </h2>

            {activeTab === "movies" ? (
              <div className="space-y-10">
                {/* Franchise groups */}
                {moviesByFranchise.map(({ franchise, movies: fMovies }) => (
                  <div key={franchise.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      <h3 className="text-base font-bold text-foreground">{franchise.title}</h3>
                      <span className="text-xs text-muted-foreground">({fMovies.length} movies)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {fMovies.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Ungrouped */}
                {ungroupedMovies.length > 0 && (
                  <div>
                    {moviesByFranchise.length > 0 && (
                      <h3 className="text-base font-bold text-foreground mb-3">Other Movies</h3>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {ungroupedMovies.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All tab: flat grid, limit 15 */
              <>
                {movies.length > 15 && (
                  <p className="text-sm text-muted-foreground mb-4">Showing 15 of {movies.length} — <button onClick={() => setActiveTab("movies")} className="text-primary hover:underline font-medium">see all movies</button></p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {movies.slice(0, 15).map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              </>
            )}
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