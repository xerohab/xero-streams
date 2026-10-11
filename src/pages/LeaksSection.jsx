import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Film, Tv, Image as ImageIcon, ShieldAlert, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import SeriesCard from "@/components/browse/SeriesCard";

export default function LeaksSection() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section"); // "series" | "image-series" | "collection"
  const franchiseId = searchParams.get("franchise"); // for collection drill-down

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setLoadingUser(false));
  }, []);

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["leaks-section-series"],
    queryFn: () => base44.entities.Series.filter({ is_adult: true }),
    enabled: !!user?.age_verified,
  });

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["leaks-section-videos"],
    queryFn: () => base44.entities.Video.filter({ is_adult: true }, "-created_date"),
    enabled: !!user?.age_verified,
  });

  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ["leaks-section-images"],
    queryFn: () => base44.entities.Image.filter({ is_adult: true }, "-created_date"),
    enabled: !!user?.age_verified,
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["leaks-section-franchises"],
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <Lock className="w-10 h-10 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h2>
          <Button onClick={() => base44.auth.redirectToLogin("/leaks")} className="bg-primary hover:bg-primary/90">Sign In</Button>
        </div>
      </div>
    );
  }

  if (!user.age_verified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <ShieldAlert className="w-10 h-10 text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Age Verification Required</h2>
          <Link to="/dashboard"><Button className="bg-red-600 hover:bg-red-700 text-white">Verify Age</Button></Link>
        </div>
      </div>
    );
  }

  const isLoading = loadingSeries || loadingVideos || loadingImages;
  const episodeCount = (seriesId) => videos.filter((v) => v.series_id === seriesId).length;
  const standaloneSeries = seriesList.filter(s => !s.franchise_id);

  // Determine what to render
  let title = "";
  let icon = null;
  let content = null;

  if (section === "series") {
    const videoSeries = standaloneSeries.filter(s => videos.some(v => v.series_id === s.id));
    title = "Series";
    icon = <Tv className="w-6 h-6 text-red-400" />;
    content = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {videoSeries.map(s => (
          <SeriesCard key={s.id} series={s} />
        ))}
      </div>
    );
  } else if (section === "image-series") {
    const imageSeries = standaloneSeries.filter(s => images.some(img => img.series_id === s.id));
    title = "Image Series";
    icon = <ImageIcon className="w-6 h-6 text-red-400" />;
    content = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {imageSeries.map(series => {
          const seriesImages = images.filter(img => img.series_id === series.id);
          const firstImage = seriesImages[0];
          return (
            <Link key={series.id} to={`/series?id=${series.id}&from=/leaks`}>
              <div className="group relative rounded-md overflow-hidden bg-secondary aspect-video cursor-pointer hover:opacity-90 transition-opacity">
                {firstImage?.image_url && <img src={firstImage.image_url} alt={series.title} className="w-full h-full object-cover" onContextMenu={e => e.preventDefault()} />}
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors flex flex-col items-center justify-center">
                  <p className="text-white font-semibold text-center px-2 mb-1">{series.title}</p>
                  <p className="text-white/80 text-xs">{seriesImages.length} image{seriesImages.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  } else if (section === "collections") {
    const adultFranchises = franchises.filter(f => seriesList.some(s => s.franchise_id === f.id));

    if (franchiseId) {
      // Drill into a specific franchise
      const franchise = franchises.find(f => f.id === franchiseId);
      const fSeries = seriesList.filter(s => s.franchise_id === franchiseId);
      title = franchise?.title || "Collection";
      icon = <Tv className="w-6 h-6 text-red-400" />;
      content = (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {fSeries.map(s => (
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
      );
    } else {
      // Show all franchises as clickable cards
      title = "Collections";
      icon = <Tv className="w-6 h-6 text-red-400" />;
      content = (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {adultFranchises.map(franchise => {
            const fSeries = seriesList.filter(s => s.franchise_id === franchise.id);
            const cover = fSeries.find(s => s.cover_image)?.cover_image;
            return (
              <Link key={franchise.id} to={`/leaks/section?section=collections&franchise=${franchise.id}`}>
                <div className="group relative rounded-md overflow-hidden bg-secondary aspect-video cursor-pointer hover:opacity-90 transition-opacity">
                  {cover
                    ? <img src={cover} alt={franchise.title} className="w-full h-full object-cover" onContextMenu={e => e.preventDefault()} />
                    : <div className="w-full h-full bg-gradient-to-br from-red-900/30 to-secondary flex items-center justify-center"><Tv className="w-8 h-8 text-muted-foreground" /></div>
                  }
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/70 transition-colors flex flex-col items-end justify-end p-2">
                    <p className="text-white font-semibold text-sm text-right">{franchise.title}</p>
                    <p className="text-white/70 text-xs">{fSeries.length} series</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-6 md:px-16 pt-24 pb-16">
        <Link to="/leaks">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Leaks
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-8">
          {icon}
          <h1 className="text-3xl font-black text-foreground">{title}</h1>
          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">18+</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : content}
      </div>
    </div>
  );
}
