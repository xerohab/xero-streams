import React, { useRef, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, Cast, Clock, Film, Loader2, PictureInPicture2, SkipBack, SkipForward, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoRow from "@/components/browse/VideoRow";
import Navbar from "@/components/browse/Navbar";
import { format } from "date-fns";
import { saveProgress, getProgress, removeProgress } from "@/hooks/useContinueWatching";
import { getCastWindow, isCastWindowOpen } from "@/components/browse/Navbar";

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
  const videoRef = useRef(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  // Track whether user explicitly paused so we don't fight the browser
  const userPausedRef = useRef(false);
  const lastSaveRef = useRef(0);
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
  };

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id: videoId });
      return videos[0];
    },
    enabled: !!videoId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
    staleTime: Infinity,
  });

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

  // Auto-cast to open cast window when video loads
  useEffect(() => {
    if (!video?.video_url || !isCastWindowOpen()) return;
    const castWin = getCastWindow();
    // Build queue from current video onwards
    const queue = fullQueue.length > 0
      ? fullQueue.slice(Math.max(currentQueueIndex, 0) + 1).map((v) => ({ src: v.video_url, title: v.title || "" }))
      : franchiseMovies.slice(Math.max(currentFranchiseIndex, 0) + 1).map((v) => ({ src: v.video_url, title: v.title || "" }));

    castWin.postMessage({
      type: "CAST_PLAY",
      src: video.video_url,
      title: video.title || "",
      queue,
    }, "*");

    // Pause local video since it's casting
    userPausedRef.current = true;
    setIsCasting(true);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
    }
  }, [video?.id]);

  const moreVideos = allVideos.filter((v) => v.id !== videoId && !v.series_id && !v.franchise_id && !v.is_adult).slice(0, 15);

  // Autoplay countdown
  const startCountdown = useCallback(() => {
    if (!nextVideoRef.current) return;
    setAutoplayCountdown(10);
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
    clearTimeout(countdownRef.current);
    userPausedRef.current = false;
  }, [videoId]);

  const cancelAutoplay = () => {
    setAutoplayCountdown(null);
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

  // Prevent accidental pauses — if something pauses the video and user didn't press pause, resume it
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handlePause = () => {
      // Only auto-resume if this wasn't triggered by user pressing pause
      if (!userPausedRef.current) {
        // Small timeout to let legitimate pauses (end of video, seeking) settle
        setTimeout(() => {
          if (el.paused && !el.ended && !userPausedRef.current) {
            el.play().catch(() => {});
          }
        }, 300);
      }
    };

    // Intercept native pause button via play/pause events
    const handlePlay = () => {
      userPausedRef.current = false;
    };

    el.addEventListener("pause", handlePause);
    el.addEventListener("play", handlePlay);
    return () => {
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("play", handlePlay);
    };
  }, [video]);

  // We need to allow user to deliberately pause via the native controls
  // Track clicks on the video to detect deliberate pause
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onClick = () => {
      // Toggle: if playing → user wants to pause; if paused → user wants to play
      if (!el.paused) {
        userPausedRef.current = true;
      } else {
        userPausedRef.current = false;
      }
    };
    el.addEventListener("click", onClick);
    // Also handle keyboard space bar pause
    const onKey = (e) => {
      if (e.code === "Space" && document.activeElement === el) {
        userPausedRef.current = !el.paused;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [video]);

  // Save progress every 10 seconds
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !video) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 10000) return;
    lastSaveRef.current = now;
    saveProgress(video, videoRef.current.currentTime, videoRef.current.duration);
  }, [video]);

  const handleEnded = useCallback(() => {
    if (video?.id) removeProgress(video.id);
    userPausedRef.current = false;
    startCountdown();
  }, [video, startCountdown]);

  // Picture-in-Picture
  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      alert("Picture-in-Picture is not supported by your browser.");
    }
  };

  // Cast to TV — send to existing cast window or open new one
  const handleCast = () => {
    if (!video?.video_url) return;
    const currentTime = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;

    const queueItems = fullQueue.length > 0
      ? fullQueue.slice(currentQueueIndex + 1).map((v) => ({ src: v.video_url, title: v.title || "" }))
      : franchiseMovies.slice(currentFranchiseIndex + 1).map((v) => ({ src: v.video_url, title: v.title || "" }));

    // Pause and unload local video
    userPausedRef.current = true;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
    }

    setIsCasting(true);

    // If a cast window is already open, send video to it
    if (isCastWindowOpen()) {
      const castWin = getCastWindow();
      castWin.postMessage({ type: "CAST_PLAY", src: video.video_url, title: video.title || "", queue: queueItems }, "*");
      castWin.focus();
      return;
    }

    // Otherwise open a new cast window
    const params = new URLSearchParams({
      src: video.video_url,
      title: video.title || "",
      t: currentTime,
    });
    if (queueItems.length > 0) {
      params.set("queue", JSON.stringify(queueItems));
    }

    const castUrl = `/cast?${params.toString()}`;
    const popup = window.open(castUrl, "_blank");

    if (!popup) {
      window.location.href = castUrl;
      return;
    }

    import("@/components/browse/Navbar").then(({ setCastWindow }) => setCastWindow(popup));

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setIsCasting(false);
        userPausedRef.current = false;
        import("@/components/browse/Navbar").then(({ setCastWindow }) => setCastWindow(null));
        if (videoRef.current) {
          videoRef.current.src = video.video_url;
          videoRef.current.load();
          videoRef.current.currentTime = currentTime;
        }
      }
    }, 500);
  };

  const handleStopCasting = () => {
    setIsCasting(false);
    userPausedRef.current = false;
    if (videoRef.current && video?.video_url) {
      videoRef.current.src = video.video_url;
      videoRef.current.load();
      videoRef.current.play();
    }
  };

  // If casting via the global cast window, monitor its closure
  useEffect(() => {
    if (!isCasting) return;
    const timer = setInterval(() => {
      if (!isCastWindowOpen()) {
        clearInterval(timer);
        setIsCasting(false);
        userPausedRef.current = false;
        if (videoRef.current && video?.video_url) {
          videoRef.current.src = video.video_url;
          videoRef.current.load();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCasting]);

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

  const embedUrl = getEmbedUrl(video.video_url);
  const isMkv = video.video_url?.toLowerCase().endsWith(".mkv");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-16">
        <div className="w-full bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="relative aspect-video">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              ) : isMkv ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-5 bg-black"
                  style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                >
                  <div className="bg-black/70 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 text-center backdrop-blur-sm">
                    <p className="text-foreground font-semibold text-lg">MKV files can't play in the browser</p>
                    <p className="text-muted-foreground text-sm max-w-xs">Use a media player like VLC to watch this file.</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    controls={!isCasting}
                    autoPlay
                    playsInline
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full"
                    style={isCasting ? { visibility: "hidden" } : {}}
                    poster={video.thumbnail_url}
                    onEnded={handleEnded}
                    onTimeUpdate={handleTimeUpdate}
                  >
                    <source src={video.video_url} />
                    Your browser does not support this video format.
                  </video>
                  {isCasting && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-3 cursor-none select-none"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <Cast className="w-10 h-10 text-white animate-pulse pointer-events-none" />
                      <p className="text-white font-semibold text-lg pointer-events-none">Playing in Cast Window</p>
                      <p className="text-muted-foreground text-xs text-center max-w-xs pointer-events-none">
                        Use your browser's Cast / AirPlay button in the cast window to send to your TV
                      </p>
                      <button
                        onClick={handleStopCasting}
                        className="mt-2 text-sm text-muted-foreground hover:text-white underline transition-colors cursor-pointer"
                      >
                        Close & Return Here
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Top-right controls */}
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                {!embedUrl && !isMkv && (
                  <button
                    onClick={handlePiP}
                    className="bg-black/60 hover:bg-black/90 text-white rounded-full p-2 transition-all backdrop-blur-sm"
                    title="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>
                )}
                {!embedUrl && !isMkv && (
                  <button
                    onClick={handleCast}
                    className="bg-black/60 hover:bg-black/90 text-white rounded-full p-2 transition-all backdrop-blur-sm"
                    title="Cast to TV"
                  >
                    <Cast className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Autoplay countdown overlay */}
              {autoplayCountdown !== null && nextVideo && (
                <div className="absolute bottom-16 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 flex flex-col items-end gap-2 z-20">
                  <p className="text-white text-sm font-semibold">Up Next</p>
                  <p className="text-muted-foreground text-xs max-w-[180px] truncate">{nextVideo.title}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelAutoplay} className="text-xs text-muted-foreground hover:text-white transition-colors">Cancel</button>
                    <button
                      onClick={() => navigate(`/watch?id=${nextVideo.id}`)}
                      className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Play in {autoplayCountdown}s
                    </button>
                  </div>
                </div>
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={isFavourited ? "default" : "outline"}
                  className={`gap-2 ${isFavourited ? "bg-red-600 hover:bg-red-700 border-red-600" : ""}`}
                  onClick={handleToggleFavourite}
                >
                  <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
                  {isFavourited ? "Favourited" : "Favourite"}
                </Button>
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
    </div>
  );
}