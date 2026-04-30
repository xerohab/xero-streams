import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Clock, Film, Play, Loader2, Users, Star, Download as DownloadIcon, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";

export default function MovieDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("id");
  const from = searchParams.get("from") || "/";
  const [castInfo, setCastInfo] = useState(null);
  const [loadingCast, setLoadingCast] = useState(false);
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: purchases = [] } = useQuery({
    queryKey: ["video_purchases", user?.id],
    queryFn: () => base44.entities.VideoPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
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
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div
        className="relative w-full h-80 md:h-[28rem] flex items-end"
        style={
          video.thumbnail_url
            ? { backgroundImage: `url(${video.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center top" }
            : {}
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative z-10 px-6 md:px-16 pb-10 w-full">
          <button
            onClick={() => navigate(from)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {(franchise || series) && (
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">
              {franchise?.title || series?.title}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">{video.title}</h1>

          <div className="flex flex-wrap gap-3 mb-5">
            {castInfo?.release_year && (
              <span className="text-sm text-muted-foreground">{castInfo.release_year}</span>
            )}
            {(video.duration || castInfo?.runtime) && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> {video.duration || castInfo.runtime}
              </span>
            )}
            {castInfo?.genre && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Film className="w-4 h-4" /> {castInfo.genre}
              </span>
            )}
            {castInfo?.rating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="w-4 h-4 text-yellow-400" /> {castInfo.rating}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {(video.coming_soon || !video.video_url) && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-semibold px-4 py-2 rounded-lg">
                <CalendarClock className="w-4 h-4" />
                Coming Soon{video.release_date ? ` — ${format(new Date(video.release_date), "d MMM yyyy")}` : ""}
              </div>
            )}
            {!video.coming_soon && video.video_url && (
              <Button
                onClick={() => navigate(`/watch?id=${video.id}`)}
                className="gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Play Now
              </Button>
            )}
            {!castInfo && (
              <Button
                variant="secondary"
                onClick={fetchCastInfo}
                disabled={loadingCast}
                className="gap-2"
              >
                {loadingCast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {loadingCast ? "Loading..." : "Cast & Crew"}
              </Button>
            )}
            {video.is_for_sale && (
              isPurchased ? (
                <Button variant="default" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => window.open(video.download_url, '_blank')}>
                  <DownloadIcon className="w-4 h-4" /> Download
                </Button>
              ) : (
                <Button variant="default" className="gap-2" onClick={handlePurchase} disabled={purchasing}>
                  {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Buy to Download (${video.price})
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-16 py-10 max-w-5xl space-y-10">
        {/* Description */}
        {video.description && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{video.description}</p>
          </div>
        )}

        {/* Cast info from AI */}
        {castInfo && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Cast & Crew
            </h2>

            {castInfo.director && (
              <p className="text-sm text-muted-foreground mb-4">
                <span className="text-foreground font-semibold">Director:</span> {castInfo.director}
              </p>
            )}

            {castInfo.cast && castInfo.cast.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {castInfo.cast.map((member, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3">
                    <p className="text-sm font-semibold text-foreground truncate">{member.actor}</p>
                    <p className="text-xs text-muted-foreground truncate">as {member.character}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}