import React, { useRef, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Cast, Clock, Download, Film, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoRow from "@/components/browse/VideoRow";
import Navbar from "@/components/browse/Navbar";
import { format } from "date-fns";

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
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("id");
  const videoRef = useRef(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const countdownRef = useRef(null);

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id: videoId });
      return videos[0];
    },
    enabled: !!videoId,
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const series = video?.series_id ? seriesList.find((s) => s.id === video.series_id) : null;

  const seriesEpisodes = series
    ? [...allVideos]
        .filter((v) => v.series_id === series.id)
        .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
    : [];

  const currentIndex = seriesEpisodes.findIndex((v) => v.id === videoId);
  const nextEpisode = currentIndex >= 0 && currentIndex < seriesEpisodes.length - 1
    ? seriesEpisodes[currentIndex + 1]
    : null;

  const moreVideos = allVideos.filter((v) => v.id !== videoId && !v.series_id).slice(0, 15);

  // Autoplay next episode countdown
  const startCountdown = () => {
    if (!nextEpisode) return;
    setAutoplayCountdown(10);
  };

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      navigate(`/watch?id=${nextEpisode.id}`);
      return;
    }
    countdownRef.current = setTimeout(() => setAutoplayCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [autoplayCountdown]);

  // Reset countdown on video change
  useEffect(() => {
    setAutoplayCountdown(null);
    clearTimeout(countdownRef.current);
  }, [videoId]);

  const cancelAutoplay = () => {
    setAutoplayCountdown(null);
    clearTimeout(countdownRef.current);
  };

  // Cast to TV
  const handleCast = async () => {
    if (!video?.video_url) return;
    if ("presentation" in navigator) {
      try {
        const request = new PresentationRequest([video.video_url]);
        request.start();
      } catch (e) {
        alert("Cast not available on this device/browser.");
      }
    } else {
      alert("Casting is not supported by your browser. Try Chrome on desktop.");
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
                    <p className="text-muted-foreground text-sm max-w-xs">Download the file and open it with a media player like VLC.</p>
                    <a href={video.video_url} download target="_blank" rel="noreferrer">
                      <Button className="bg-primary hover:bg-primary/90 gap-2">
                        <Download className="w-4 h-4" />
                        Download to Watch
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={video.thumbnail_url}
                  onEnded={startCountdown}
                >
                  <source src={video.video_url} />
                  Your browser does not support this video format.
                </video>
              )}

              {/* Autoplay countdown overlay */}
              {autoplayCountdown !== null && nextEpisode && (
                <div className="absolute bottom-16 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 flex flex-col items-end gap-2 z-20">
                  <p className="text-white text-sm font-semibold">Up Next</p>
                  <p className="text-muted-foreground text-xs max-w-[180px] truncate">{nextEpisode.title}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelAutoplay} className="text-xs text-muted-foreground hover:text-white transition-colors">Cancel</button>
                    <button
                      onClick={() => navigate(`/watch?id=${nextEpisode.id}`)}
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
                {nextEpisode && (
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => navigate(`/watch?id=${nextEpisode.id}`)}
                  >
                    <SkipForward className="w-4 h-4" />
                    Play Next Episode
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={handleCast}>
                  <Cast className="w-4 h-4" />
                  Cast to TV
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
            videos={seriesEpisodes.filter((v) => v.id !== videoId)}
          />
        )}
        {moreVideos.length > 0 && (
          <VideoRow title="You May Also Like" videos={moreVideos} />
        )}
      </div>
    </div>
  );
}