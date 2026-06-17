import React, { useRef, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import useHls from "@/hooks/useHls";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, CalendarClock, Cast, Clock, Film, Loader2, PictureInPicture2, SkipBack, SkipForward, Heart, Download as DownloadIcon, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoRow from "@/components/browse/VideoRow";
import Navbar from "@/components/browse/Navbar";
import { format } from "date-fns";
import ReviewSection from "@/components/browse/ReviewSection";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { saveProgress, getProgress, removeProgress } from "@/hooks/useContinueWatching";

import { useCast } from "@/lib/CastContext";

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

export default function Watch() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoId = new URLSearchParams(location.search).get("id");
  const { openCast, isCasting: isMobileCasting } = useCast();
  const videoRef = useRef(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipRecap, setShowSkipRecap] = useState(false);

  const lastSaveRef = useRef(0);
  const countdownStartedRef = useRef(false);
  // Track current video id being played (for seamless next-episode without navigate)
  const [currentVideoId, setCurrentVideoId] = useState(videoId);
  const nextVideoRef = useRef(null);

  useEffect(() => {
    setCurrentVideoId(videoId);
  }, [videoId]);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u && videoId) {
        setIsFavourited(u.favourites?.includes(videoId) ?? false);
      }
    }).catch(() => {});
  }, [videoId]);

  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    const current = user.favourites || [];
    const updated = isFavourited ? current.filter((id) => id !== videoId) : [...current, videoId];
    await base44.auth.updateMe({ favourites: updated });
    setUser((prev) => ({ ...prev, favourites: updated }));
    setIsFavourited(!isFavourited);
    base44.analytics.track({
      eventName: isFavourited ? "video_unfavourited" : "video_favourited",
      properties: { video_id: videoId }
    });
  };

  const [purchasing, setPurchasing] = useState(false);
  const { data: purchases = [] } = useQuery({
    queryKey: ["video_purchases", user?.id],
    queryFn: () => base44.entities.VideoPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    base44.analytics.track({ eventName: "video_purchase_initiated", properties: { video_id: video.id, price: video.price } });
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

  const { data: allVideos = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
    staleTime: Infinity,
  });

  const videoFromAll = allVideos.find(v => v.id === videoId);

  const { data: fetchedVideo, isLoading: isFetchingVideo } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id: videoId });
      return videos[0];
    },
    enabled: !!videoId && !videoFromAll,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const video = videoFromAll || fetchedVideo;
  const isLoading = !video && (isFetchingVideo || isLoadingAll);

  useEffect(() => {
    if (video) {
      base44.analytics.track({
        eventName: "video_viewed",
        properties: { video_id: video.id, title: video.title, series_id: video.series_id || null, franchise_id: video.franchise_id || null }
      });
      
      base44.functions.invoke("incrementViews", {
        video_id: video.id,
        series_id: video.series_id || null,
        franchise_id: video.franchise_id || null
      }).catch(err => console.error("Failed to increment views:", err));
    }
  }, [video?.id]);

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
    staleTime: Infinity,
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
    staleTime: Infinity,
  });

  // HLS hook — stop local playback when cast overlay is open
  const hlsSrc = (() => {
    const url = video?.video_url;
    if (!url || isMobileCasting || getEmbedUrl(url)) return null;
    return url;
  })();
  useHls(videoRef, hlsSrc);

  const series = video?.series_id ? seriesList.find((s) => s.id === video.series_id) : null;

  // All episodes in this series sorted by episode number
  const seriesEpisodes = series
    ? [...allVideos]
        .filter((v) => v.series_id === series.id)
        .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
    : [];

  // Build full playable queue: if series belongs to a franchise, chain all series episodes in order
  // Series in the same franchise sorted by sort_order
  const franchiseSeries = series?.franchise_id
    ? [...seriesList]
        .filter((s) => s.franchise_id === series.franchise_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  const fullQueue = franchiseSeries.length > 1
    ? franchiseSeries.flatMap((s) =>
        [...allVideos]
          .filter((v) => v.series_id === s.id)
          .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      )
    : seriesEpisodes;

  // Franchise movies for "Up Next" on standalone movies
  const franchiseMovies = video?.franchise_id && !series
    ? allVideos
        .filter((v) => v.franchise_id === video.franchise_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  const currentQueueIndex = fullQueue.findIndex((v) => v.id === videoId);
  const currentFranchiseIndex = franchiseMovies.findIndex((v) => v.id === videoId);

  const nextEpisode = currentQueueIndex >= 0 && currentQueueIndex < fullQueue.length - 1
    ? fullQueue[currentQueueIndex + 1]
    : null;
  const prevEpisode = currentQueueIndex > 0
    ? fullQueue[currentQueueIndex - 1]
    : null;

  // For display in buttons — still use series episodes for prev/next labels
  const currentSeriesIndex = seriesEpisodes.findIndex((v) => v.id === videoId);
  const prevSeriesEpisode = currentSeriesIndex > 0 ? seriesEpisodes[currentSeriesIndex - 1] : null;

  const nextFranchiseMovie = currentFranchiseIndex >= 0 && currentFranchiseIndex < franchiseMovies.length - 1
    ? franchiseMovies[currentFranchiseIndex + 1]
    : null;
  const prevFranchiseMovie = currentFranchiseIndex > 0
    ? franchiseMovies[currentFranchiseIndex - 1]
    : null;

  const nextVideo = nextEpisode || nextFranchiseMovie;
  const prevVideo = prevSeriesEpisode || prevEpisode || prevFranchiseMovie;

  // Keep nextVideoRef in sync for use inside event handlers
  useEffect(() => {
    nextVideoRef.current = nextVideo;
  }, [nextVideo]);



  const moreVideos = allVideos.filter((v) => v.id !== videoId && !v.series_id && !v.franchise_id && !v.is_adult).slice(0, 15);

  // Autoplay countdown
  const startCountdown = useCallback((seconds = 10) => {
    if (!nextVideoRef.current) return;
    setAutoplayCountdown(seconds);
  }, []);

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      // Seamlessly navigate to next video
      navigate(`/watch?id=${nextVideoRef.current.id}`);
      return;
    }
    countdownRef.current = setTimeout(() => setAutoplayCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [autoplayCountdown]);

  useEffect(() => {
    setAutoplayCountdown(null);
    countdownStartedRef.current = false;
    clearTimeout(countdownRef.current);
  }, [videoId]);

  const cancelAutoplay = () => {
    setAutoplayCountdown(null);
    countdownStartedRef.current = true; // prevent starting again on same video
    clearTimeout(countdownRef.current);
  };

  // Resume from saved position
  useEffect(() => {
    if (!videoRef.current || !video) return;
    const params = new URLSearchParams(window.location.search);
    const t = parseInt(params.get("t"));
    if (t > 0) {
      videoRef.current.currentTime = t;
    } else {
      const saved = getProgress(videoId);
      if (saved?.currentTime > 0) {
        videoRef.current.currentTime = saved.currentTime;
      }
    }
  }, [video]);

  // No auto-resume logic — let the native video controls handle play/pause normally

  // Save progress every 10 seconds
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !video) return;
    const now = Date.now();
    const t = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    
    if (video.intro_start != null && video.intro_end != null && t >= video.intro_start && t < video.intro_end) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
    
    if (video.recap_start != null && video.recap_end != null && t >= video.recap_start && t < video.recap_end) {
      setShowSkipRecap(true);
    } else {
      setShowSkipRecap(false);
    }

    if (duration > 0 && duration - t <= 10 && !countdownStartedRef.current && nextVideoRef.current) {
      countdownStartedRef.current = true;
      startCountdown(10);
    }

    if (now - lastSaveRef.current < 10000) return;
    lastSaveRef.current = now;
    saveProgress(video, t, duration);
  }, [video, startCountdown]);

  const handleEnded = useCallback(() => {
    if (video?.id) removeProgress(video.id);
    if (!countdownStartedRef.current) {
      startCountdown(0);
    }
  }, [video, startCountdown]);

  // Picture-in-Picture
  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
        base44.analytics.track({ eventName: "pip_toggled", properties: { video_id: video?.id } });
      }
    } catch {
      alert("Picture-in-Picture is not supported by your browser.");
    }
  };

  // Cast — open fullscreen overlay on all devices with proper queue
  const handleCast = () => {
    if (!video?.video_url) return;
    base44.analytics.track({ eventName: "cast_initiated", properties: { video_id: video?.id } });
    const currentTime = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;

    // Build queue of remaining videos after current
    let queueItems = [];
    if (fullQueue.length > 1 && currentQueueIndex >= 0) {
      // TV series / franchise series queue
      queueItems = fullQueue
        .slice(currentQueueIndex + 1)
        .filter((v) => v.video_url)
        .map((v) => ({ src: v.video_url, title: v.title || "" }));
    } else if (franchiseMovies.length > 1 && currentFranchiseIndex >= 0) {
      // Franchise movies queue
      queueItems = franchiseMovies
        .slice(currentFranchiseIndex + 1)
        .filter((v) => v.video_url)
        .map((v) => ({ src: v.video_url, title: v.title || "" }));
    }

    openCast(video.video_url, video.title || "", queueItems, currentTime);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Video not found</h2>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isComingSoon = video.coming_soon || !video.video_url;
  const embedUrl = !isComingSoon ? getEmbedUrl(video.video_url) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-16">
        <div className="w-full bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="relative aspect-video">
              {isComingSoon ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black"
                  style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
                    <CalendarClock className="w-14 h-14 text-amber-400" />
                    <h2 className="text-white text-2xl md:text-3xl font-black">Coming Soon</h2>
                    {video.release_date && (
                      <p className="text-amber-400 text-base font-semibold">
                        {format(new Date(video.release_date), "d MMMM yyyy")}
                      </p>
                    )}
                    <p className="text-white/60 text-sm max-w-xs">
                      This content isn't available yet. Check back soon!
                    </p>
                  </div>
                </div>
              ) : embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full"
                  poster={video.thumbnail_url}
                  onEnded={handleEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onError={(e) => {
                    const err = e.target.error;
                    console.error("[Watch] Video element error", {
                      code: err?.code,
                      message: err?.message,
                      src: e.target.src,
                      meaning: ["", "ABORTED", "NETWORK_ERROR", "DECODE_ERROR", "SRC_NOT_SUPPORTED"][err?.code] || "UNKNOWN",
                    });
                  }}
                >
                  {video.subtitles?.map((sub, i) => (
                    <track key={i} src={sub.url} kind="subtitles" srcLang={sub.language} label={sub.label} />
                  ))}
                </video>
              )}

              {/* Skip Buttons */}
              {showSkipIntro && (
                <button
                  onClick={() => {
                    videoRef.current.currentTime = video.intro_end;
                    base44.analytics.track({ eventName: "intro_skipped", properties: { video_id: video.id } });
                  }}
                  className="absolute bottom-20 right-6 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-md font-semibold z-30 border border-white/20 transition-all flex items-center gap-2 text-sm shadow-lg"
                >
                  <SkipForward className="w-4 h-4" /> Skip Intro
                </button>
              )}
              {showSkipRecap && (
                <button
                  onClick={() => {
                    videoRef.current.currentTime = video.recap_end;
                    base44.analytics.track({ eventName: "recap_skipped", properties: { video_id: video.id } });
                  }}
                  className="absolute bottom-20 right-6 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-md font-semibold z-30 border border-white/20 transition-all flex items-center gap-2 text-sm shadow-lg"
                >
                  <SkipForward className="w-4 h-4" /> Skip Recap
                </button>
              )}

              {/* Top-right controls — hidden when coming soon or embedded */}
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                {!isComingSoon && !embedUrl && (
                  <button
                    onClick={handlePiP}
                    className="bg-black/60 hover:bg-black/90 text-white rounded-full p-2 transition-all backdrop-blur-sm"
                    title="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>
                )}
                {!isComingSoon && !embedUrl && (
                  <button
                    onClick={handleCast}
                    className="bg-black/60 hover:bg-black/90 text-white rounded-full p-2 transition-all backdrop-blur-sm"
                    title="Cast / Fullscreen Player"
                  >
                    <Cast className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Autoplay countdown overlay */}
              {autoplayCountdown !== null && nextVideo && (
                <dialog
                  ref={el => { if (el && !el.open) el.showModal(); }}
                  onCancel={(e) => { e.preventDefault(); cancelAutoplay(); }}
                  className="up-next-dialog bg-black/80 backdrop-blur-sm rounded-xl p-4 border-none m-0 fixed z-50 flex-col items-end gap-2"
                  style={{ bottom: '5rem', right: '1rem', left: 'auto', top: 'auto', display: 'flex' }}
                >
                  <style>{`.up-next-dialog::backdrop { background: transparent; }`}</style>
                  <p className="text-white text-sm font-semibold">Up Next</p>
                  <p className="text-muted-foreground text-xs max-w-[180px] truncate">{nextVideo.title}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelAutoplay} className="text-xs text-muted-foreground hover:text-white transition-colors">Cancel</button>
                    <button
                      onClick={() => {
                        cancelAutoplay();
                        navigate(`/watch?id=${nextVideo.id}`, { replace: true });
                      }}
                      className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Play in {autoplayCountdown}s
                    </button>
                  </div>
                </dialog>
              )}
            </div>
          </div>
        </div>

        {/* Video info */}
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              {series && (
                <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-1">
                  {series.title}
                  {video.episode_number && ` — Episode ${video.episode_number}`}
                </p>
              )}
              <h1 className="text-2xl md:text-4xl font-black text-foreground mb-3">{video.title}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                {video.quality && video.quality !== "Unknown" && (
                  <span className="flex items-center gap-1.5 font-bold text-primary border border-primary/50 px-1.5 py-0.5 rounded text-xs uppercase">{video.quality}</span>
                )}
                {video.quality_notes && (
                  <span className="flex items-center gap-1.5 font-semibold text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs capitalize">{video.quality_notes}</span>
                )}
                {video.duration && (
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{video.duration}</span>
                )}
                {series?.category && (
                  <span className="flex items-center gap-1.5"><Film className="w-4 h-4" />{series.category.charAt(0).toUpperCase() + series.category.slice(1)}</span>
                )}
                {video.created_date && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{format(new Date(video.created_date), "MMM d, yyyy")}</span>
                )}
              </div>

              {video.description && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl mb-4">{video.description}</p>
              )}

              {/* Coming Soon badge on info panel */}
              {isComingSoon && (
                <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-semibold px-4 py-2 rounded-lg w-fit mb-2">
                  <CalendarClock className="w-4 h-4" />
                  Coming Soon{video.release_date ? ` — ${format(new Date(video.release_date), "d MMMM yyyy")}` : ""}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {!isComingSoon && (
                  <Button
                    variant={isFavourited ? "default" : "outline"}
                    className={`gap-2 ${isFavourited ? "bg-red-600 hover:bg-red-700 border-red-600" : ""}`}
                    onClick={handleToggleFavourite}
                  >
                    <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
                    {isFavourited ? "Favourited" : "Favourite"}
                  </Button>
                )}
                <WatchlistButton videoId={video.id} />
                {prevVideo && (
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => navigate(`/watch?id=${prevVideo.id}`)}
                  >
                    <SkipBack className="w-4 h-4" />
                    {prevSeriesEpisode ? "Previous Episode" : prevFranchiseMovie ? "Previous Movie" : "Previous Episode"}
                  </Button>
                )}
                {nextVideo && (
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => navigate(`/watch?id=${nextVideo.id}`)}
                  >
                    <SkipForward className="w-4 h-4" />
                    {nextEpisode ? "Next Episode" : "Next Movie"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate(`/movie?id=${video.id}`)}
                >
                  <Film className="w-4 h-4" />
                  More Info
                </Button>
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
        </div>
      </div>

      {/* More episodes / related */}
      <div className="pb-16">
        {seriesEpisodes.length > 1 && (
          <VideoRow
            title={`All Episodes — ${series?.title}`}
            videos={seriesEpisodes}
          />
        )}
        {moreVideos.length > 0 && (
          <VideoRow title="You May Also Like" videos={moreVideos} />
        )}
      </div>
      
      <div className="max-w-7xl mx-auto px-6 md:px-16 pb-16">
        <ReviewSection contentId={videoId} contentType="video" />
      </div>
    </div>
  );
}