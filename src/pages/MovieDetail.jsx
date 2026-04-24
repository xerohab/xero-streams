import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Film, Play, Loader2, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";

export default function MovieDetail() {
  const navigate = useNavigate();
  const videoId = new URLSearchParams(window.location.search).get("id");
  const [castInfo, setCastInfo] = useState(null);
  const [loadingCast, setLoadingCast] = useState(false);

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
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
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
            onClick={() => navigate(-1)}
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
            <Button
              onClick={() => navigate(`/watch?id=${video.id}`)}
              className="gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Play Now
            </Button>
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