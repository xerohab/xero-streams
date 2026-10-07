import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Clock, Film, Play, Loader2, User, Download as DownloadIcon, ShoppingCart } from "lucide-react";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import WatchlistButton from "@/components/browse/WatchlistButton";
import ReviewSection from "@/components/browse/ReviewSection";
import Footer from "@/components/browse/Footer";

export default function MovieDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("id");
  const from = searchParams.get("from") || "/";
  const [castInfo, setCastInfo] = useState(null);
  const [loadingCast, setLoadingCast] = useState(false);
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: purchases = [] } = useQuery({
    queryKey: ["video_purchases", user?.id],
    queryFn: () => base44.entities.VideoPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: premiumSubs = [] } = useQuery({
    queryKey: ["active_subscription", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" }),
    enabled: !!user
  });
  
  const isPremium = user?.role === "admin" || premiumSubs.length > 0;

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    base44.analytics.track({ eventName: "video_purchase_initiated_from_detail", properties: { video_id: video.id, price: video.price } });
    setPurchasing(true);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { 
        amount: video.price,
        return_url: window.location.origin + "/callback?success=true",
        cancel_url: window.location.origin + "/callback?cancelled=true"
      });
      if (res.data?.approvalUrl) {
        localStorage.setItem("pending_video_purchase", JSON.stringify({ video_id: video.id }));
        window.location.href = res.data.approvalUrl;
      } else {
        throw new Error(res.data?.error || "Failed to checkout");
      }
    } catch (err) {
      console.error(err);
      setPurchasing(false);
    }
  };

  const isPurchased = purchases.some(p => p.video_id === video?.id && p.status === "completed");

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id: videoId });
      return videos[0];
    },
    enabled: !!videoId,
  });

  useEffect(() => {
    if (video) {
      base44.analytics.track({
        eventName: "movie_detail_viewed",
        properties: { video_id: video.id, title: video.title }
      });
    }
  }, [video?.id]);

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
  });

  const series = video?.series_id ? seriesList.find((s) => s.id === video.series_id) : null;
  const franchise = video?.franchise_id ? franchises.find((f) => f.id === video.franchise_id) : null;

  const fetchCastInfo = async () => {
    if (!video) return;
    base44.analytics.track({ eventName: "cast_info_fetched", properties: { video_id: video.id } });
    setLoadingCast(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Give me detailed cast and crew information for the film or TV show called "${video.title}". Include the main cast (up to 8 actors), the director, and the release year. Keep descriptions short (one line each).`,
        response_json_schema: {
          type: "object",
          properties: {
            release_year: { type: "string" },
            director: { type: "string" },
            runtime: { type: "string" },
            genre: { type: "string" },
            rating: { type: "string" },
            cast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  actor: { type: "string" },
                  character: { type: "string" },
                },
              },
            },
          },
        },
      });
      setCastInfo(result);
    } finally {
      setLoadingCast(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold mb-2">Not found</h2>
          <Button variant="secondary" onClick={() => navigate(from)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Cinematic Hero Backdrop */}
      <div className="relative w-full h-[55vh] md:h-[70vh] max-h-[800px] bg-black">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
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
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-secondary flex items-center justify-center"><Film className="w-12 h-12 text-muted-foreground/30" /></div>
            )}
          </div>
          
          <div className="flex-1 z-10 space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">{video.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium">
              {video.release_year ? <span>{video.release_year}</span> : (video.release_date && <span>{new Date(video.release_date).getFullYear()}</span>)}
              {video.duration && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {video.duration}</span>
                </>
              )}
              {video.quality && video.quality !== "Unknown" && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-sm border border-white/20 text-xs uppercase font-bold text-white">
                    {video.quality}
                  </span>
                </>
              )}
            </div>
            
            {video.description && (
              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl line-clamp-3 md:line-clamp-none drop-shadow-md">
                {video.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {(video.coming_soon || !video.video_url) ? (
                <Button disabled className="gap-2 font-bold h-11 px-6 rounded-full bg-secondary text-secondary-foreground">
                  <CalendarClock className="w-5 h-5" /> Coming Soon
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate(`/watch?id=${video.id}`)}
                  className="gap-2 font-bold h-12 px-8 rounded-full shadow-lg shadow-primary/20 text-base"
                >
                  <Play className="w-5 h-5 fill-current" /> Watch Now
                </Button>
              )}
              <WatchlistButton videoId={video.id} />
              
              {video.is_for_sale && (
                isPurchased ? (
                  <Button variant="default" className="gap-2 rounded-full h-12 px-6 bg-green-600 hover:bg-green-700" onClick={() => {
                    const a = document.createElement("a");
                    a.href = video.download_url;
                    a.download = "";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}>
                    <DownloadIcon className="w-4 h-4" /> Download
                  </Button>
                ) : (
                  <Button variant="default" className="gap-2 rounded-full h-12 px-6" onClick={handlePurchase} disabled={purchasing}>
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Buy to Download (${video.price})
                  </Button>
                )
              )}
              
              {!video.is_for_sale && isPremium && !(video.coming_soon || !video.video_url) && (
                <Button
                  variant="secondary"
                  className="gap-2 bg-green-600/20 text-green-500 hover:bg-green-600/30 border-green-600/30 border rounded-full h-12 px-6"
                  onClick={async () => {
                    try {
                      setIsDownloading(true);
                      setDownloadProgress(0);
                      await downloadSingleVideo(video.id, (pct) => setDownloadProgress(pct));
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsDownloading(false);
                      setDownloadProgress(null);
                    }
                  }}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />} 
                  {isDownloading ? (downloadProgress !== null ? `Downloading ${downloadProgress}%` : "Starting...") : "Download"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[2000px] mx-auto px-4 md:px-12 lg:px-16 pt-24 pb-16 space-y-12">
        {video.cast && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Cast & Crew</h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              {video.cast}
            </p>
          </div>
        )}
        {castInfo?.cast && castInfo.cast.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Cast</h2>
            <div className="flex flex-wrap gap-3">
              {castInfo.cast.map((actor, idx) => (
                <div key={idx} className="bg-secondary/30 border border-border/50 rounded-lg px-4 py-2 flex flex-col items-center justify-center text-center w-[140px]">
                  <p className="text-sm font-bold text-foreground w-full truncate" title={actor.actor}>{actor.actor}</p>
                  <p className="text-xs text-muted-foreground w-full truncate" title={actor.character}>{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReviewSection contentId={videoId} contentType="video" />
      </div>
      <Footer />
    </div>
  );
}