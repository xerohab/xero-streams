import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, Clock, Film, Play, Loader2, Download as DownloadIcon, ShoppingCart } from "lucide-react";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import DetailHero from "@/components/browse/DetailHero";
import VideoCard from "@/components/browse/VideoCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import WatchlistButton from "@/components/browse/WatchlistButton";
import ReviewSection from "@/components/browse/ReviewSection";
import Footer from "@/components/browse/Footer";

const OUTLINE_BTN = "gap-2 rounded-full h-12 px-6 border-white/20 bg-white/5 text-foreground hover:bg-white/10";

export default function MovieDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("id");
  const from = searchParams.get("from") || "/";
  const [castInfo] = useState(null);
  
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

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id: videoId });
      return videos[0];
    },
    enabled: !!videoId,
  });

  const { data: franchise } = useQuery({ queryKey: ["franchise", video?.franchise_id], queryFn: async () => { const res = await base44.entities.Franchise.filter({id: video.franchise_id}); return res[0]; }, enabled: !!video?.franchise_id });

  const { data: movieCatalog = [] } = useQuery({
    queryKey: ["movies_more_like_this"],
    queryFn: () => base44.entities.Video.filter({ content_type: "movie", is_adult: false }, "-updated_date", 120),
  });
  
  const isPremium = user?.role === "admin" || premiumSubs.length > 0;

  // More Like This: same collection first, then same category, then newest
  const moreLikeThis = movieCatalog
    .filter((v) => v.id !== videoId && !v.series_id)
    .map((v) => ({
      v,
      score: (video?.franchise_id && v.franchise_id === video.franchise_id ? 2 : 0) + (video?.category_id && v.category_id === video.category_id ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ v }) => v)
    .slice(0, 14);

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

  useEffect(() => {
    if (video) {
      base44.analytics.track({
        eventName: "movie_detail_viewed",
        properties: { video_id: video.id, title: video.title }
      });
    }
  }, [video?.id]);

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

  const castMembers = video.cast ? video.cast.split(",").map((c) => c.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <DetailHero
        image={video.thumbnail_url}
        title={video.title}
        FallbackIcon={Film}
        backTo={from}
        eyebrow={franchise && (
          <Link to={`/franchise?id=${franchise.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            Part of {franchise.title} Collection &rarr;
          </Link>
        )}
        meta={
          <>
            {video.release_year ? <span>{video.release_year}</span> : (video.release_date && <span>{new Date(video.release_date).getFullYear()}</span>)}
            {video.duration && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {video.duration}</span>}
            {video.quality && video.quality !== "Unknown" && (
              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{video.quality}</span>
            )}
          </>
        }
        description={video.description}
      >
        {(video.coming_soon || !video.video_url) ? (
          <Button disabled className="gap-2 font-bold h-12 px-6 rounded-full bg-secondary text-secondary-foreground">
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
        <WatchlistButton videoId={video.id} variant="outline" className={OUTLINE_BTN} />

        {video.is_for_sale && (
          isPurchased ? (
            <Button variant="outline" className={`${OUTLINE_BTN} border-primary/40 text-primary`} onClick={() => {
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
            variant="outline"
            className={`${OUTLINE_BTN} border-primary/40 text-primary hover:bg-primary/15`}
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
      </DetailHero>

      <div className="xero-container flex-1 space-y-12 pb-16 pt-24">
        {castMembers.length > 0 && (
          <section>
            <SectionHeader title="Cast & Crew" />
            <div className="flex flex-wrap gap-2">
              {castMembers.map((name) => (
                <span key={name} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground">
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}
        {castInfo?.cast && castInfo.cast.length > 0 && (
          <section>
            <SectionHeader title="Cast" />
            <div className="flex flex-wrap gap-3">
              {castInfo.cast.map((actor, idx) => (
                <div key={idx} className="flex w-[140px] flex-col items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-center">
                  <p className="w-full truncate text-sm font-bold text-foreground" title={actor.actor}>{actor.actor}</p>
                  <p className="w-full truncate text-xs text-muted-foreground" title={actor.character}>{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {moreLikeThis.length > 0 && (
          <section>
            <SectionHeader title="More Like This" />
            <MediaGrid>
              {moreLikeThis.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </MediaGrid>
          </section>
        )}

        <ReviewSection contentId={videoId} contentType="video" />
      </div>
      <Footer />
    </div>
  );
}