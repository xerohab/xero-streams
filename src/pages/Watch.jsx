import {useProfile} from "@/lib/ProfileContext";
import {allowsKidsContent} from "@/lib/parentalControls";
import PlaybackReport from "@/components/browse/PlaybackReport";
import {useProfileFavourites} from "@/lib/useProfileFavourites";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import useHls from "@/hooks/useHls";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarClock, Loader2, PictureInPicture2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/browse/VideoCard";
import MediaGrid from "@/components/browse/MediaGrid";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import WatchPartyControls from "@/components/browse/WatchPartyControls";
import WatchPrimaryControls from "@/components/browse/WatchPrimaryControls";
import WatchInfo from "@/components/browse/WatchInfo";
import loadMediaRecords from "@/components/browse/loadMediaRecords";
import Navbar from "@/components/browse/Navbar";
import { format } from "date-fns";
import ReviewSection from "@/components/browse/ReviewSection";
import { saveProgress, getProgress, removeProgress, addWatched, syncPlayback } from "@/hooks/useContinueWatching";

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
  const { isCasting: isMobileCasting } = useCast();
  const videoRef = useRef(null);
  const [cinemaMode,setCinemaMode]=useState(false);
  const [bingeMode,setBingeMode]=useState(()=>localStorage.getItem("xero_binge_mode")==="true");
  const [playbackPrefs,setPlaybackPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem("xero_playback_preferences")||"{}");}catch{return {};}});
  const savePlaybackPrefs=e=>{const v=e.currentTarget;const prefs={volume:v.volume,muted:v.muted,rate:v.playbackRate};setPlaybackPrefs(prefs);try{localStorage.setItem("xero_playback_preferences",JSON.stringify(prefs));}catch{}};
  const restorePlaybackPrefs=e=>{const v=e.currentTarget;if(Number.isFinite(playbackPrefs.volume))v.volume=Math.max(0,Math.min(1,playbackPrefs.volume));if(typeof playbackPrefs.muted==="boolean")v.muted=playbackPrefs.muted;if(Number.isFinite(playbackPrefs.rate))v.playbackRate=Math.max(.5,Math.min(2,playbackPrefs.rate));};
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [user, setUser] = useState(null);
  const profileFavourites=useProfileFavourites(user,"favourites");
  const isFavourited=profileFavourites.values.includes(videoId);

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipRecap, setShowSkipRecap] = useState(false);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const lastSaveRef = useRef(0);
  const countdownStartedRef = useRef(false);
  const psSessionIdRef = useRef(null);
  const lastPsTrackRef = useRef(0);
  const psTrackQueueRef = useRef(Promise.resolve());
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
      }
    }).catch(() => {});
  }, [videoId]);

  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    await profileFavourites.toggle(videoId);
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

  const { data: premiumSubs = [] } = useQuery({
    queryKey: ["active_subscription", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" }),
    enabled: !!user
  });
  const isPremium = user?.role === "admin" || premiumSubs.length > 0;

  const { data: allVideos = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["cinema_catalog", "videos"],
    queryFn: () => loadMediaRecords(base44.entities.Video),
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

  const playbackProfile=useProfile()?.activeProfile;
  const playbackProfileId=playbackProfile?.id||null;
  const kids=playbackProfile?.is_kids;
  const candidateVideo = videoFromAll || fetchedVideo;
  const video=kids&&!allowsKidsContent(candidateVideo)?null:candidateVideo;
  const isPurchased = purchases.some(p => p.video_id === video?.id && p.status === "completed");
  const isLoading = !video && (isFetchingVideo || isLoadingAll);

  useEffect(() => {
    if (video) {
      psSessionIdRef.current = crypto.randomUUID();
      lastPsTrackRef.current = 0;
      document.title = `${video.title} | Xero Streams`;
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
    queryKey: ["cinema_catalog", "series"],
    queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000),
    staleTime: Infinity,
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["cinema_catalog", "franchises"],
    queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000),
    staleTime: Infinity,
  });

  // HLS hook — stop local playback when cast overlay is open
  const hlsSrc = (() => {
    const url = video?.video_url;
    if (!url || isMobileCasting || getEmbedUrl(url)) return null;
    return url;
  })();
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const [playbackIssue, setPlaybackIssue] = useState(null);
  useHls(videoRef, hlsSrc, playbackProfileId, playbackAttempt);

  useEffect(() => {
    setPlaybackIssue(null);
    const player = videoRef.current;
    if (!hlsSrc || !player) return;
    const showIssue = () => setPlaybackIssue("The stream couldn't be loaded.");
    const clearIssue = () => setPlaybackIssue(null);
    const startupTimer = window.setTimeout(() => {
      if (player.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        setPlaybackIssue("The stream is taking too long to load.");
      }
    }, 20000);
    player.addEventListener("error", showIssue);
    player.addEventListener("canplay", clearIssue);
    return () => {
      window.clearTimeout(startupTimer);
      player.removeEventListener("error", showIssue);
      player.removeEventListener("canplay", clearIssue);
    };
  }, [hlsSrc, playbackProfileId, playbackAttempt]);

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

  const candidate = nextEpisode || nextFranchiseMovie;
  const nextVideo = candidate?.video_url && !candidate.coming_soon && !candidate.is_adult && (!kids||allowsKidsContent(candidate)) ? candidate : null;
  const previousCandidate = prevSeriesEpisode || prevEpisode || prevFranchiseMovie;
  const prevVideo = !kids||allowsKidsContent(previousCandidate)?previousCandidate:null;

  // Keep nextVideoRef in sync for use inside event handlers
  useEffect(() => {
    nextVideoRef.current = nextVideo;
  }, [nextVideo]);



  const moreVideos = allVideos.filter((v) => v.id !== videoId && !v.series_id && !v.franchise_id && !v.is_adult && (!kids||allowsKidsContent(v))).slice(0, 15);

  // Autoplay countdown
  const startCountdown = useCallback((seconds = 10) => {
    if (!nextVideoRef.current) return;
    setAutoplayCountdown(seconds);
  }, []);

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      // Seamlessly navigate to next video
      if (nextVideoRef.current) navigate(`/watch?id=${nextVideoRef.current.id}`);
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
      const player=videoRef.current;
      const saved = getProgress(videoId);
      if (saved?.currentTime > 0) player.currentTime = saved.currentTime;
      const initial=player.currentTime;
      syncPlayback().then(()=>{const remote=getProgress(videoId);if(videoRef.current===player&&player.paused&&Math.abs(player.currentTime-initial)<1&&remote?.currentTime>0)player.currentTime=remote.currentTime;}).catch(()=>{});
    }
  }, [video]);

  // No auto-resume logic — let the native video controls handle play/pause normally

  // Save progress every 10 seconds
  const sendPlaybackReport = useCallback((payload) => {
    const next = psTrackQueueRef.current.catch(() => {}).then(() => base44.functions.invoke("partnerTrackViewing", payload));
    psTrackQueueRef.current = next.catch(() => {});
    return next;
  }, []);

  const trackPlaybackBoundary = useCallback(() => {
    const player = videoRef.current;
    if (!user || !video?.id || !player) return;
    if (!psSessionIdRef.current) psSessionIdRef.current = crypto.randomUUID();
    lastPsTrackRef.current = Date.now();
    sendPlaybackReport({
      video_id: video.id, session_id: psSessionIdRef.current,
      current_time: player.currentTime, duration: Number.isFinite(player.duration) ? player.duration : 0,
      is_paused: player.paused, is_ended: player.ended
    }).catch(() => {});
  }, [user, video?.id, sendPlaybackReport]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !video) return;
    const now = Date.now();
    const t = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    
    if (Number.isFinite(video.intro_start) && Number.isFinite(video.intro_end) && video.intro_start >= 0 && video.intro_end <= videoRef.current.duration && t >= video.intro_start && t < video.intro_end) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
    
    if (Number.isFinite(video.recap_start) && Number.isFinite(video.recap_end) && video.recap_start >= 0 && video.recap_end <= videoRef.current.duration && t >= video.recap_start && t < video.recap_end) {
      setShowSkipRecap(true);
    } else {
      setShowSkipRecap(false);
    }

    setShowSkipCredits(Number.isFinite(video.credits_start)&&Number.isFinite(video.credits_end)&&video.credits_start>=0&&video.credits_end>video.credits_start&&Number.isFinite(duration)&&video.credits_end<=duration&&t>=video.credits_start&&t<video.credits_end);
    if (duration > 0 && duration - t <= 10 && !countdownStartedRef.current && nextVideoRef.current) {
      countdownStartedRef.current = true;
      startCountdown(10);
    }

    if (now - lastSaveRef.current < 10000) return;
    lastSaveRef.current = now;
    saveProgress(video, t, duration, playbackProfileId);

    // Perk Sphere viewing tracking (every 30 seconds)
    if (user && videoRef.current && now - lastPsTrackRef.current >= 30000) {
      lastPsTrackRef.current = now;
      sendPlaybackReport({
        video_id: video.id,
        session_id: psSessionIdRef.current,
        current_time: videoRef.current.currentTime,
        duration: videoRef.current.duration,
        is_paused: videoRef.current.paused,
        is_ended: false,
      }).catch(() => {});
    }
  }, [video, startCountdown, user, sendPlaybackReport, playbackProfileId]);

  const handleEnded = useCallback(() => {
    if (video?.id) {
      removeProgress(video.id,playbackProfileId);
      addWatched(video.id,playbackProfileId);
    }
    // Perk Sphere viewing ended signal
    if (user && video?.id && psSessionIdRef.current) {
      sendPlaybackReport({
        video_id: video.id,
        session_id: psSessionIdRef.current,
        current_time: videoRef.current?.duration || 0,
        duration: videoRef.current?.duration || 0,
        is_paused: false,
        is_ended: true,
      }).catch(() => {});
    }
    if (!countdownStartedRef.current) {
      startCountdown(10);
    }
  }, [video, startCountdown, user, sendPlaybackReport, playbackProfileId]);

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



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if(kids&&candidateVideo&&!allowsKidsContent(candidateVideo))return <div className="min-h-screen flex items-center justify-center p-6 text-center">This title is unavailable on Kids profiles.</div>;
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
      {!isFullscreen && <Navbar />}

      <div className="pt-24">
        <div className="xero-container">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
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
                  key={playbackProfileId||'guest'}
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  {...{ "webkit-playsinline": "true" }}
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full"
                  poster={video.thumbnail_url}
                  onLoadedMetadata={restorePlaybackPrefs}
                  onVolumeChange={savePlaybackPrefs}
                  onRateChange={savePlaybackPrefs}
                  onEnded={handleEnded}
                  onTimeUpdate={e=>{handleTimeUpdate();const v=e.currentTarget;if(bingeMode&&Number.isFinite(video.intro_start)&&Number.isFinite(video.intro_end)&&video.intro_end>video.intro_start&&video.intro_end<v.duration&&v.currentTime>=video.intro_start&&v.currentTime<video.intro_end)v.currentTime=video.intro_end;}}
                  onPlay={trackPlaybackBoundary}
                  onPause={trackPlaybackBoundary}
                  onSeeking={trackPlaybackBoundary}
                  onSeeked={trackPlaybackBoundary}
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

              {hlsSrc && playbackIssue && (
                <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-center gap-3 bg-black/90 p-3 text-white" role="status">
                  <span>{playbackIssue}</span>
                  <Button variant="secondary" onClick={() => setPlaybackAttempt(attempt => attempt + 1)}>Retry playback</Button>
                </div>
              )}

              {/* Skip Buttons */}
              {showSkipIntro && (
                <button
                  onClick={() => {
                    if (Number.isFinite(video.intro_end) && video.intro_end > videoRef.current.currentTime && video.intro_end <= videoRef.current.duration) videoRef.current.currentTime = video.intro_end;
                    base44.analytics.track({ eventName: "intro_skipped", properties: { video_id: video.id } });
                  }}
                  className="absolute bottom-20 right-6 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-md font-semibold z-30 border border-white/20 transition-all flex items-center gap-2 text-sm shadow-lg"
                >
                  <SkipForward className="w-4 h-4" /> Skip Intro
                </button>
              )}
              {showSkipRecap && !showSkipIntro && (
                <button
                  onClick={() => {
                    if (Number.isFinite(video.recap_end) && video.recap_end > videoRef.current.currentTime && video.recap_end <= videoRef.current.duration) videoRef.current.currentTime = video.recap_end;
                    base44.analytics.track({ eventName: "recap_skipped", properties: { video_id: video.id } });
                  }}
                  className="absolute bottom-20 right-6 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-md font-semibold z-30 border border-white/20 transition-all flex items-center gap-2 text-sm shadow-lg"
                >
                  <SkipForward className="w-4 h-4" /> Skip Recap
                </button>
              )}

              {showSkipCredits && !showSkipIntro && !showSkipRecap && !embedUrl && (
                <button className="absolute bottom-20 right-6 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-md font-semibold z-30 flex items-center gap-2" onClick={()=>{const player=videoRef.current;if(player&&Number.isFinite(video.credits_end)&&video.credits_end<=player.duration&&player.currentTime>=video.credits_start&&player.currentTime<video.credits_end)player.currentTime=video.credits_end;}}><SkipForward className="w-4 h-4" /> Skip Credits</button>
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

              </div>

              {/* Autoplay countdown overlay */}
              {autoplayCountdown !== null && nextVideo && (
                <div role="status" className="absolute bottom-16 right-3 z-40 flex flex-col items-end gap-2 rounded-xl bg-black/90 p-3 shadow-xl border border-white/20">
                  <p className="text-white text-sm font-semibold">Up Next · {autoplayCountdown}s</p>
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
                      Watch Now
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>

        </div>
        <div className="xero-container">
          {user && !isComingSoon && !embedUrl && !video.is_adult && <WatchPartyControls key={videoId} videoId={videoId} videoRef={videoRef} />}
          {!isComingSoon&&!embedUrl&&<div className="flex gap-3 items-center py-2"><button className="xero-action px-3 py-2" onClick={()=>{const v=videoRef.current;if(v){v.currentTime=0;v.play().catch(()=>{});}}}>Restart</button><label className="flex items-center gap-2"><input type="checkbox" checked={bingeMode} onChange={e=>{setBingeMode(e.target.checked);localStorage.setItem("xero_binge_mode",String(e.target.checked));}}/>Binge Mode</label><button className="xero-action px-3 py-2" onClick={()=>{const v=videoRef.current;if(!v)return;if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});setCinemaMode(false);}else{v.requestFullscreen?.().then(()=>setCinemaMode(true)).catch(()=>{});}}}>{cinemaMode&&isFullscreen?"Exit Cinema Mode":"Cinema Mode"}</button></div>}
          <WatchPrimaryControls video={video} series={series} isComingSoon={isComingSoon} isPremium={isPremium} isPurchased={isPurchased} isFavourited={isFavourited} onFavourite={handleToggleFavourite} prevVideo={prevVideo} nextVideo={nextVideo} prevLabel={prevSeriesEpisode || prevEpisode ? "Previous Episode" : "Previous Movie"} nextLabel={nextEpisode ? "Next Episode" : "Next Movie"} onNavigate={navigate} onPurchase={handlePurchase} purchasing={purchasing} />
          <WatchInfo video={video} series={series} />
          {user&&<PlaybackReport key={videoId} videoId={videoId}/>}
        </div>
      </div>

      {/* More episodes / related */}
      <div className="xero-container space-y-8 pb-6">
        {seriesEpisodes.length > 0 && <section className="xero-section">
          <SectionHeader title="All Episodes" subtitle={series?.title} />
          <EpisodeGrid>{seriesEpisodes.map((ep) => <EpisodeCard key={ep.id} video={ep} isPremium={isPremium} active={ep.id === videoId} />)}</EpisodeGrid>
        </section>}
        {moreVideos.length > 0 && <section className="xero-section">
          <SectionHeader title="You May Also Like" />
          <MediaGrid>{moreVideos.slice(0, 14).map((item) => <VideoCard key={item.id} video={item} />)}</MediaGrid>
        </section>}
      </div>
      
      <div className="xero-container pb-20">
        <ReviewSection contentId={videoId} contentType="video" />
      </div>
    </div>
  );
}