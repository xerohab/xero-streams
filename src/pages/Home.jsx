import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import { Loader2, Film, Tv, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContinueWatchingRow from "@/components/browse/ContinueWatchingRow";
import VideoRow from "@/components/browse/VideoRow";
import Footer from "@/components/browse/Footer";

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("xero_welcome_seen")) {
      setShowWelcome(true);
    }
  }, []);

  const closeWelcome = () => {
    localStorage.setItem("xero_welcome_seen", "true");
    setShowWelcome(false);
  };

  const refreshUser = () => base44.auth.me().then(setUser).catch(() => {});

  useEffect(() => {
    refreshUser();
    // Re-check user when window regains focus (e.g. after dashboard verification)
    window.addEventListener("focus", refreshUser);
    return () => window.removeEventListener("focus", refreshUser);
  }, []);

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list("-created_date"),
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list("-created_date"),
  });

  const isLoading = loadingVideos || loadingSeries;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Latest 5 for hero banner — exclude adult content
  const heroVideos = videos.filter((v) => !v.is_adult).slice(0, 5);

  // Exclude adult content from main tabs
  const safeVideos = videos.filter((v) => !v.is_adult);
  const safeSeries = seriesList.filter((s) => !s.is_adult);

  const getAllFranchiseIds = (fId, allFranchises) => {
    const ids = new Set([fId]);
    let added = true;
    while(added) {
      added = false;
      allFranchises.forEach(f => {
        if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
          ids.add(f.id);
          added = true;
        }
      });
    }
    return Array.from(ids);
  };

  const getTopLevelGroup = () => {
    const topLevelMap = new Map();
    
    // Add all top-level franchises
    const rootFranchises = franchises.filter(f => !f.parent_id && !f.is_adult);
    rootFranchises.forEach(f => {
       topLevelMap.set(f.id, { type: 'franchise', data: f, latestActivityAt: new Date(f.content_updated_at || f.created_date).getTime(), totalViews: f.views || 0 });
    });

    safeSeries.forEach(s => {
       let rootFId = null;
       if (s.franchise_id) {
          const possibleF = franchises.find(f => f.id === s.franchise_id);
          rootFId = possibleF ? (possibleF.parent_id || possibleF.id) : null;
          while (rootFId) {
             const parent = franchises.find(f => f.id === rootFId);
             if (parent && parent.parent_id) rootFId = parent.parent_id;
             else break;
          }
       }
       const activity = new Date(s.content_updated_at || s.created_date).getTime();
       if (rootFId && topLevelMap.has(rootFId)) {
          const group = topLevelMap.get(rootFId);
          group.latestActivityAt = Math.max(group.latestActivityAt, activity);
          group.totalViews += (s.views || 0);
       } else if (!rootFId) {
          topLevelMap.set(s.id, { type: 'series', data: s, latestActivityAt: activity, totalViews: s.views || 0 });
       }
    });

    safeVideos.forEach(v => {
       let targetGroup = null;
       
       if (v.franchise_id) {
          let rootFId = v.franchise_id;
          while (rootFId) {
             const parent = franchises.find(f => f.id === rootFId);
             if (parent && parent.parent_id) rootFId = parent.parent_id;
             else break;
          }
          if (rootFId && topLevelMap.has(rootFId)) {
             targetGroup = topLevelMap.get(rootFId);
          }
       } else if (v.series_id) {
          const s = safeSeries.find(s => s.id === v.series_id);
          if (s && s.franchise_id) {
             let rootFId = s.franchise_id;
             while (rootFId) {
                const parent = franchises.find(f => f.id === rootFId);
                if (parent && parent.parent_id) rootFId = parent.parent_id;
                else break;
             }
             if (rootFId && topLevelMap.has(rootFId)) targetGroup = topLevelMap.get(rootFId);
          } else if (s && topLevelMap.has(s.id)) {
             targetGroup = topLevelMap.get(s.id);
          }
       }
       
       const activity = new Date(v.content_updated_at || v.created_date).getTime();
       if (targetGroup) {
          targetGroup.latestActivityAt = Math.max(targetGroup.latestActivityAt, activity);
          targetGroup.totalViews += (v.views || 0);
       } else if (!v.series_id && !v.franchise_id) {
          topLevelMap.set(v.id, { type: 'video', data: v, latestActivityAt: activity, totalViews: v.views || 0 });
       }
    });

    return Array.from(topLevelMap.values());
  };

  const topLevelItems = getTopLevelGroup();

  const finalLatestItems = topLevelItems
    .filter(item => item.latestActivityAt >= sevenDaysAgo.getTime())
    .sort((a, b) => b.latestActivityAt - a.latestActivityAt)
    .slice(0, 10);

  const finalMostWatchedItems = topLevelItems
    .filter(item => item.totalViews > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  // Movies: standalone movies only
  // Exclude anything with a series_id
  const movies = safeVideos.filter(
    (v) => !v.series_id
  );

  // Franchises with content (safe only — no adult), newest first
  const franchisesWithContent = franchises
    .filter((f) => !f.parent_id)
    .filter((f) => {
      const allIds = getAllFranchiseIds(f.id, franchises);
      const hasSeries = safeSeries.some((s) => allIds.includes(s.franchise_id));
      const hasVideos = safeVideos.some((v) => allIds.includes(v.franchise_id));
      return hasSeries || hasVideos;
    });

  // Series that have episodes (safe only), newest first
  const seriesWithEpisodes = safeSeries
    .filter((s) => safeVideos.some((v) => v.series_id === s.id));

  const episodeCountBySeries = (seriesId) =>
    safeVideos.filter((v) => v.series_id === seriesId).length;

  // Grouped series by franchise (for TV tab)
  const seriesByFranchise = franchisesWithContent
    .map((f) => {
      const allIds = getAllFranchiseIds(f.id, franchises);
      return {
        franchise: f,
        series: seriesWithEpisodes.filter((s) => allIds.includes(s.franchise_id)),
        totalItems: seriesWithEpisodes.filter((s) => allIds.includes(s.franchise_id)).length + movies.filter((v) => allIds.includes(v.franchise_id)).length
      };
    })
    .filter((g) => g.series.length > 0 || g.franchise.title.toLowerCase().includes("wrestling"));

  const ungroupedSeries = seriesWithEpisodes.filter((s) => !s.franchise_id || !franchises.some((f) => f.id === s.franchise_id));

  // Grouped movies by franchise (for Movies tab)
  const moviesByFranchise = franchisesWithContent
    .map((f) => {
      const allIds = getAllFranchiseIds(f.id, franchises);
      return {
        franchise: f,
        movies: movies.filter((v) => allIds.includes(v.franchise_id))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        totalItems: seriesWithEpisodes.filter((s) => allIds.includes(s.franchise_id)).length + movies.filter((v) => allIds.includes(v.franchise_id)).length
      };
    })
    .filter((g) => g.movies.length > 0 && !g.franchise.title.toLowerCase().includes("wrestling"));

  const ungroupedMovies = movies.filter((v) => !v.franchise_id || !franchises.some((f) => f.id === v.franchise_id));

  const rows = user?.homepage_rows || ["hero", "latest", "continue_watching", "favourites", "tv", "movies"];

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
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
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
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
            <button onClick={closeWelcome} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-4 mt-2">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-2">Welcome to Xero Streams!</h2>
              <p className="text-muted-foreground text-sm">Your new home for premium entertainment.</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-bold mb-1 flex items-center gap-2"><Film className="w-4 h-4 text-primary" /> Free to Watch</h3>
                <p className="text-sm text-muted-foreground">Enjoy our extensive library of movies and TV series completely free of charge.</p>
              </div>
              
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-bold mb-1 flex items-center gap-2"><Tv className="w-4 h-4 text-primary" /> Premium Features</h3>
                <p className="text-sm text-muted-foreground">Subscribers can <strong>download individual episodes and movies</strong>, or grab a <strong>whole series at once</strong> with the Download All button.</p>
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-bold mb-1 flex items-center gap-2"><Film className="w-4 h-4 text-primary" /> Library Store</h3>
                <p className="text-sm text-muted-foreground">Visit our store to purchase books and expand your digital collection.</p>
              </div>
            </div>
            
            <Button onClick={closeWelcome} className="w-full font-bold">Start Watching</Button>
          </div>
        </div>
      )}

      <Navbar />

      {/* Hero: latest 5 videos */}
      {rows.includes("hero") && <HeroSection videos={heroVideos} seriesList={seriesList} />}

      {/* Tabs */}
      <div className="relative z-10 -mt-6 px-6 md:px-16 mb-8">
        <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md border border-border rounded-full p-1 w-fit flex-wrap">
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
        {/* Latest Row */}
        {rows.includes("latest") && finalLatestItems.length > 0 && activeTab === "all" && (
          <div className="mb-12 -mx-6 md:-mx-16">
            <div className="px-6 md:px-16 mb-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground">Latest</h2>
            </div>
            <div className="px-6 md:px-16 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5">
              {finalLatestItems.map((item) => {
                const isUpdated = item.latestActivityAt >= sevenDaysAgo.getTime();
                if (item.type === 'franchise') return <FranchiseCard key={`franchise-${item.data.id}`} franchise={item.data} isUpdated={isUpdated} />;
                if (item.type === 'series') return <SeriesCard key={`series-${item.data.id}`} series={item.data} episodeCount={episodeCountBySeries(item.data.id)} isUpdated={isUpdated} />;
                return <VideoCard key={`video-${item.data.id}`} video={item.data} isUpdated={isUpdated} />;
              })}
            </div>
          </div>
        )}

        {/* Most Watched Row */}
        {finalMostWatchedItems.length > 0 && activeTab === "all" && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground">Most Watched</h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5">
              {finalMostWatchedItems.map((item) => {
                if (item.type === 'franchise') return <FranchiseCard key={`mw-franchise-${item.data.id}`} franchise={item.data} />;
                if (item.type === 'series') return <SeriesCard key={`mw-series-${item.data.id}`} series={item.data} episodeCount={episodeCountBySeries(item.data.id)} />;
                return <VideoCard key={`mw-video-${item.data.id}`} video={item.data} />;
              })}
            </div>
          </div>
        )}

        {rows.includes("continue_watching") && <ContinueWatchingRow />}

        {/* Favourites Row */}
        {rows.includes("favourites") && user?.favourites?.length > 0 && activeTab === "all" && (
          <div className="mb-12">
            <VideoRow 
              title="My Favourites" 
              videos={safeVideos.filter(v => user.favourites.includes(v.id))} 
            />
          </div>
        )}

        {/* TV Series tab */}
        {rows.includes("tv") && (activeTab === "all" || activeTab === "tv") && (ungroupedSeries.length > 0 || seriesByFranchise.length > 0) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Tv className="w-5 h-5 text-primary" /> TV Series
              </h2>
              {activeTab === "all" && (seriesByFranchise.length + ungroupedSeries.length) > 8 && (
                <button onClick={() => setActiveTab("tv")} className="text-sm text-primary hover:underline font-semibold">
                  See all →
                </button>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5">
              {(() => {
                // Merge franchises and standalone series, sorted by newest created_date
                const franchiseItems = seriesByFranchise.map(({ franchise, totalItems }) => ({
                  date: franchise.created_date,
                  el: <FranchiseCard key={franchise.id} franchise={franchise} itemCount={totalItems} itemLabel="Titles" />,
                }));
                const seriesItems = ungroupedSeries.map((s) => ({
                  date: s.created_date,
                  el: <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />,
                }));
                const combined = [...franchiseItems, ...seriesItems]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((item) => item.el);
                return activeTab === "all" ? combined.slice(0, 10) : combined;
              })()}
            </div>
          </div>
        )}

        {/* Movies tab */}
        {rows.includes("movies") && (activeTab === "all" || activeTab === "movies") && (ungroupedMovies.length > 0 || moviesByFranchise.length > 0) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Movies
              </h2>
              {activeTab === "all" && (moviesByFranchise.length + ungroupedMovies.length) > 8 && (
                <button onClick={() => setActiveTab("movies")} className="text-sm text-primary hover:underline font-semibold">
                  See all →
                </button>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5">
              {(() => {
                // Merge franchises and standalone movies, sorted by newest created_date
                const franchiseItems = moviesByFranchise.map(({ franchise, totalItems }) => ({
                  date: franchise.created_date,
                  el: <FranchiseCard key={franchise.id} franchise={franchise} itemCount={totalItems} itemLabel="Titles" />,
                }));
                const movieItems = ungroupedMovies.map((v) => ({
                  date: v.created_date,
                  el: <VideoCard key={v.id} video={v} />,
                }));
                const combined = [...franchiseItems, ...movieItems]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((item) => item.el);
                return activeTab === "all" ? combined.slice(0, 10) : combined;
              })()}
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

      </div>
      <Footer />
    </div>
  );
}