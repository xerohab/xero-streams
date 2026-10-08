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
import CastCredits from "@/components/browse/CastCredits";
import GenreChips from "@/components/browse/GenreChips";
import Footer from "@/components/browse/Footer";
import StatusBadge from "@/components/browse/StatusBadge";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

const OUTLINE_BTN = "xero-action px-5";

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
      document.title = `${video.title} | Xero Streams`;
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
        backdrop={video.backdrop_url}
        title={video.title}
        FallbackIcon={Film}
        backTo={from}
        eyebrow={<><StatusBadge status="Movie" />{isRecentlyUpdated(toActivityTimestamp(video.content_updated_at)) && <StatusBadge status="UPDATED" />}{franchise && <Link to={`/franchise?id=${franchise.id}`} className="text-xs font-semibold text-primary hover:underline">{franchise.title} Collection</Link>}</>}
        meta={
          <>
            {video.release_year ? <span>{video.release_year}</span> : (video.release_date && <span>{new Date(video.release_date).getFullYear()}</span>)}
            {video.duration && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {video.duration}</span>}
            {video.quality && video.quality !== "Unknown" && (
              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{video.quality}</span>
            )}
            {video.age_rating && (
              <span className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-bold uppercase text-foreground">{video.age_rating}</span>
            )}
            {video.runtime_or_episodes && <span>{video.runtime_or_episodes}</span>}
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
            className="h-11 gap-2 rounded-lg px-6 font-bold"
          >
            <Play className="w-5 h-5 fill-current" /> Watch Now
          </Button>
        )}
        <WatchlistButton videoId={video.id} variant="outline" className={OUTLINE_BTN} label="My List" />

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

      <main className="xero-container flex-1 space-y-8 pb-12 pt-8">
        <GenreChips record={video} legacyField="category" className="flex-wrap gap-2" />
        <CastCredits
          mainCast={video.main_cast?.length ? video.main_cast : castMembers}
          guestStars={video.guest_stars || []}
          directorOrCreator={video.director_or_creator}
        />

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
      </main>
      <Footer />
    </div>
  );
}