import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldAlert, Film, Tv, Loader2, Lock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import ContinueWatchingRow from "@/components/browse/ContinueWatchingRow";

export default function Leaks() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setLoadingUser(false));
  }, []);

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["leaks-videos"],
    queryFn: () => base44.entities.Video.filter({ is_adult: true }, "-created_date"),
    enabled: !!user?.age_verified,
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["leaks-series"],
    queryFn: () => base44.entities.Series.filter({ is_adult: true }),
    enabled: !!user?.age_verified,
  });

  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ["leaks-images"],
    queryFn: () => base44.entities.Image.filter({ is_adult: true }, "-created_date"),
    enabled: !!user?.age_verified,
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["leaks-franchises"],
    queryFn: () => base44.entities.Franchise.list(),
    enabled: !!user?.age_verified,
  });



  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">You must be signed in to access this section.</p>
          <Button onClick={() => base44.auth.redirectToLogin("/leaks")} className="bg-primary hover:bg-primary/90 gap-2">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Logged in but not age-verified
  if (!user.age_verified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Age Verification Required</h2>
          <p className="text-muted-foreground mb-2">This section contains adult content (18+).</p>
          <p className="text-muted-foreground mb-6 text-sm">You need to verify your age in your dashboard to access this content.</p>
          <Link to="/dashboard">
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
              <ShieldAlert className="w-4 h-4" /> Verify Age in Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = loadingVideos || loadingSeries || loadingImages;

  const movies = videos.filter((v) => !v.series_id);
  const episodeCount = (seriesId) => videos.filter((v) => v.series_id === seriesId).length;

  // Franchise-grouped series (have franchise_id)
  const adultFranchises = franchises.filter(f =>
    seriesList.some(s => s.franchise_id === f.id)
  );
  const seriesInFranchise = (franchiseId) => seriesList.filter(s => s.franchise_id === franchiseId);

  // Standalone series (no franchise_id)
  const standaloneSeries = seriesList.filter(s => !s.franchise_id);
  const videoSeries = standaloneSeries.filter((s) => videos.some((v) => v.series_id === s.id));
  const imageSeries = standaloneSeries.filter((s) => images.some((img) => img.series_id === s.id));



  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header Banner */}
      <div className="relative pt-24 pb-10 px-6 md:px-16 bg-gradient-to-b from-red-950/30 to-background">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-red-400" />
          <h1 className="text-3xl md:text-5xl font-black text-foreground">Leaks</h1>
          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">18+</span>
        </div>
        <p className="text-muted-foreground text-sm md:text-base">Exclusive adult content — verified members only</p>
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-16 mb-8">
        <div className="flex items-center gap-1 bg-secondary/60 rounded-full p-1 w-fit flex-wrap">
          {[
            { id: "all", label: "All" },
            { id: "videos", label: "Videos", icon: Film },
            { id: "images", label: "Images", icon: ImageIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === id ? "bg-red-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-16 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ContinueWatchingRow isAdult={true} />

            {/* Franchises / Collections */}
            {(activeTab === "all" || activeTab === "videos") && adultFranchises.length > 0 && (
              <div className="mb-12">
                <Link to="/leaks/section?section=collections" className="group flex items-center gap-2 mb-4 w-fit hover:opacity-80 transition-opacity">
                  <Tv className="w-5 h-5 text-red-400" />
                  <h2 className="text-xl font-bold text-foreground">Collections</h2>
                  <span className="text-sm text-muted-foreground font-normal">({adultFranchises.length})</span>
                  <span className="text-xs text-red-400 font-semibold ml-1 opacity-0 group-hover:opacity-100 transition-opacity">See all →</span>
                </Link>
                <div className="space-y-8">
                  {(activeTab === "all" ? adultFranchises.slice(0, 8) : adultFranchises).map(franchise => {
                    const fSeries = seriesInFranchise(franchise.id);
                    return (
                      <div key={franchise.id}>
                        <Link to={`/leaks/section?section=collections&franchise=${franchise.id}`} className="group flex items-center gap-2 mb-3 w-fit hover:opacity-80 transition-opacity">
                          <span className="text-red-400">▸</span>
                          <span className="font-bold text-foreground">{franchise.title}</span>
                          <span className="text-xs text-muted-foreground font-normal">({fSeries.length} series)</span>
                          <span className="text-xs text-red-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">See all →</span>
                        </Link>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {fSeries.slice(0, 6).map(s => (
                            <Link key={s.id} to={`/series?id=${s.id}&from=/leaks`}>
                              <div className="group relative rounded-md overflow-hidden bg-secondary aspect-video cursor-pointer hover:opacity-90 transition-opacity">
                                {s.cover_image
                                  ? <img src={s.cover_image} alt={s.title} className="w-full h-full object-cover" onContextMenu={e => e.preventDefault()} />
                                  : <div className="w-full h-full bg-gradient-to-br from-red-900/30 to-secondary flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground" /></div>
                                }
                                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/70 transition-colors flex flex-col items-end justify-end p-2">
                                  <p className="text-white font-semibold text-sm text-right">{s.title}</p>
                                  {episodeCount(s.id) > 0 && <p className="text-white/70 text-xs">{episodeCount(s.id)} video{episodeCount(s.id) !== 1 ? "s" : ""}</p>}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Videos */}
            {(activeTab === "all" || activeTab === "videos") && (movies.length > 0 || videoSeries.length > 0) && (
              <>
                {movies.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <Film className="w-5 h-5 text-red-400" /> Videos
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       {movies.map((v) => (
                         <VideoCard key={v.id} video={v} from="/leaks" isAdult={true} />
                       ))}
                     </div>
                  </div>
                )}
                {videoSeries.length > 0 && (
                  <div className="mb-12">
                    <Link to="/leaks/section?section=series" className="group flex items-center gap-2 mb-4 w-fit hover:opacity-80 transition-opacity">
                      <Tv className="w-5 h-5 text-red-400" />
                      <h2 className="text-xl font-bold text-foreground">Series</h2>
                      <span className="text-sm text-muted-foreground font-normal">({videoSeries.length})</span>
                      <span className="text-xs text-red-400 font-semibold ml-1 opacity-0 group-hover:opacity-100 transition-opacity">See all →</span>
                    </Link>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       {(activeTab === "all" ? videoSeries.slice(0, 8) : videoSeries).map((s) => (
                         <SeriesCard key={s.id} series={s} episodeCount={episodeCount(s.id)} from="/leaks" />
                       ))}
                     </div>
                  </div>
                )}
              </>
            )}

            {/* Images */}
            {(activeTab === "all" || activeTab === "images") && imageSeries.length > 0 && (
              <div className="mb-12">
                <Link to="/leaks/section?section=image-series" className="group flex items-center gap-2 mb-4 w-fit hover:opacity-80 transition-opacity">
                  <ImageIcon className="w-5 h-5 text-red-400" />
                  <h2 className="text-xl font-bold text-foreground">Image Series</h2>
                  <span className="text-sm text-muted-foreground font-normal">({imageSeries.length})</span>
                  <span className="text-xs text-red-400 font-semibold ml-1 opacity-0 group-hover:opacity-100 transition-opacity">See all →</span>
                </Link>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {(activeTab === "all" ? imageSeries.slice(0, 8) : imageSeries).map((series) => {
                     const seriesImages = images.filter(img => img.series_id === series.id);
                     const firstImage = seriesImages[0];
                     return (
                       <Link key={series.id} to={`/series?id=${series.id}&from=/leaks`}>
                         <div className="group relative rounded-md overflow-hidden bg-secondary aspect-video cursor-pointer hover:opacity-90 transition-opacity">
                           {firstImage?.image_url && <img src={firstImage.image_url} alt={series.title} className="w-full h-full object-cover" onContextMenu={e => e.preventDefault()} />}
                           <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors flex flex-col items-center justify-center">
                             <p className="text-white font-semibold text-center px-2 mb-2">{series.title}</p>
                             <p className="text-white/80 text-xs">{seriesImages.length} image{seriesImages.length !== 1 ? "s" : ""}</p>
                           </div>
                         </div>
                       </Link>
                     );
                   })}
                 </div>
              </div>
            )}

            {(() => {
               const hasContent = movies.length > 0 || videoSeries.length > 0 || imageSeries.length > 0;
               if (!hasContent) {
                 return (
                   <div className="text-center py-20 text-muted-foreground">
                     <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-red-400/50" />
                     <p>No content yet. Check back soon.</p>
                   </div>
                 );
               }
               return null;
             })()}
          </>
          )}
          </div>
          </div>
          );
          }