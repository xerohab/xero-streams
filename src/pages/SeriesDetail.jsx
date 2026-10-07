import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Film, Tv, Loader2, Download as DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import EpisodeCard from "@/components/browse/EpisodeCard";
import ReviewSection from "@/components/browse/ReviewSection";
import { Heart } from "lucide-react";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import { usePremiumModal } from "@/lib/PremiumModalContext";
import Footer from "@/components/browse/Footer";
import WatchlistButton from "@/components/browse/WatchlistButton";

export default function SeriesDetail() {
  const [searchParams] = useSearchParams();
  const seriesId = searchParams.get("id");
  const from = searchParams.get("from") || "/";

  const [user, setUser] = useState(null);
  const { open: openPremium } = usePremiumModal();
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isFavourited = user?.favourite_series?.includes(seriesId) ?? false;
  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    const current = user.favourite_series || [];
    const updated = isFavourited ? current.filter((id) => id !== seriesId) : [...current, seriesId];
    await base44.auth.updateMe({ favourite_series: updated });
    setUser((prev) => ({ ...prev, favourite_series: updated }));
  };

  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: async () => {
      const list = await base44.entities.Series.filter({ id: seriesId });
      return list[0];
    },
    enabled: !!seriesId,
  });

  const { data: episodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ["episodes", seriesId],
    queryFn: () => base44.entities.Video.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ["series-images", seriesId],
    queryFn: () => base44.entities.Image.filter({ series_id: seriesId }, "-created_date"),
    enabled: !!seriesId,
  });

  const { data: premiumSubs = [] } = useQuery({
    queryKey: ["active_subscription", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" }),
    enabled: !!user
  });
  const { data: franchise } = useQuery({ queryKey: ["franchise", series?.franchise_id], queryFn: async () => { const res = await base44.entities.Franchise.filter({id: series.franchise_id}); return res[0]; }, enabled: !!series?.franchise_id });
  
  const isPremium = user?.role === "admin" || premiumSubs.length > 0;

  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
    return a.title.localeCompare(b.title);
  });

  if (loadingSeries || loadingEpisodes || loadingImages) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-foreground mb-2">Series not found</h2>
          <Link to={from}><Button variant="secondary">Back to Browse</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Cinematic Hero Backdrop */}
      <div className="relative w-full h-[55vh] md:h-[70vh] max-h-[800px] bg-black">
        {series.cover_image ? (
          <img
            src={series.cover_image}
            alt=""
            className="w-full h-full object-cover opacity-40 md:opacity-50"
            style={{ maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)" }}
          />
        ) : (
          <div className="w-full h-full bg-secondary/20"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 lg:px-16 pb-8 pt-32 max-w-[2000px] mx-auto flex flex-col md:flex-row gap-8 items-end">
          {/* Poster */}
          <div className="hidden md:block w-48 lg:w-64 shrink-0 shadow-2xl rounded-xl overflow-hidden border border-border/50 translate-y-16 z-10">
            {series.cover_image ? (
              <img src={series.cover_image} alt={series.title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-secondary flex items-center justify-center"><Tv className="w-12 h-12 text-muted-foreground/30" /></div>
            )}
          </div>
          
          <div className="flex-1 z-10 space-y-4">
            <Link to={from} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-2 md:hidden">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            {franchise && (
              <Link to={`/franchise?id=${franchise.id}`} className="inline-flex items-center gap-2 text-primary font-bold hover:underline mb-1">
                Part of {franchise.title} Collection &rarr;
              </Link>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">{series.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium">
              {series.release_year && <span>{series.release_year}</span>}
              {series.category && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span className="capitalize">{series.category}</span>
                </>
              )}
              {series.is_adult && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold tracking-widest shadow-lg">18+</span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-gray-500"></span>
              <span>{sortedEpisodes.length} Episode{sortedEpisodes.length !== 1 && 's'}</span>
            </div>
            
            {series.description && (
              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl line-clamp-3 md:line-clamp-none drop-shadow-md">
                {series.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <WatchlistButton videoId={null} seriesId={series.id} />
              
              <Button
                variant={isFavourited ? "default" : "outline"}
                className={`gap-2 rounded-full h-11 px-6 transition-colors ${isFavourited ? "bg-red-600 hover:bg-red-700 border-red-600 text-white" : "border-white/20 text-white hover:bg-white/10"}`}
                onClick={handleToggleFavourite}
              >
                <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
                {isFavourited ? "Favourited" : "Favourite Series"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[2000px] mx-auto px-4 md:px-12 lg:px-16 pt-24 pb-16 space-y-12">
        
        {sortedEpisodes.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Episodes</h2>
            {sortedEpisodes.some((ep) => !ep.coming_soon && ep.video_url) && (
              <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2 bg-secondary/30 p-4 rounded-xl border border-border/50">
                <DownloadIcon className="w-5 h-5 text-primary" />
                <span>Downloading is available for premium members. Hover over an episode to save it for offline viewing.</span>
                {!isPremium && <button type="button" onClick={openPremium} className="text-primary font-bold underline hover:text-primary/80 ml-2">View plans</button>}
              </p>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-start">
              {sortedEpisodes.map(ep => (
                <EpisodeCard key={ep.id} video={ep} isPremium={isPremium} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary/20 rounded-xl border border-border/50">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold">No Episodes Yet</h3>
            <p className="text-muted-foreground">Check back later for new episodes.</p>
          </div>
        )}

        {images.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Gallery</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {images.map(img => (
                <div key={img.id} className="min-w-[280px] md:min-w-[400px] aspect-video flex-none snap-start rounded-xl overflow-hidden shadow-lg border border-border/50 relative group">
                  <img src={img.image_url} alt={img.title || "Gallery Image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onContextMenu={e => e.preventDefault()} />
                  {img.title && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <p className="text-white font-bold text-center px-4">{img.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <ReviewSection contentId={seriesId} contentType="series" />
      </div>
      <Footer />
    </div>
  );
}