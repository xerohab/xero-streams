import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";

export default function SeriesDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const seriesId = urlParams.get("id");

  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: async () => {
      const list = await base44.entities.Series.filter({ id: seriesId });
      return list[0];
    },
    enabled: !!seriesId,
  });

  const { data: episodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ["episodes", seriesId],
    queryFn: () => base44.entities.Video.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
    return a.title.localeCompare(b.title);
  });

  if (loadingSeries || loadingEpisodes) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-foreground mb-2">Series not found</h2>
          <Link to="/"><Button variant="secondary">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div
        className="relative w-full h-72 md:h-96 bg-card flex items-end"
        style={
          series.cover_image
            ? { backgroundImage: `url(${series.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {}
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 px-6 md:px-16 pb-8 w-full">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Browse
            </Button>
          </Link>
          {series.category && (
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">
              {series.category.charAt(0).toUpperCase() + series.category.slice(1)}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2">{series.title}</h1>
          {series.description && (
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed">
              {series.description}
            </p>
          )}
          <p className="text-muted-foreground text-sm mt-2">
            <Film className="inline w-4 h-4 mr-1" />
            {sortedEpisodes.length} episode{sortedEpisodes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Episodes Grid */}
      <div className="px-6 md:px-16 py-10">
        <h2 className="text-xl font-bold text-foreground mb-6">All Episodes</h2>
        {sortedEpisodes.length === 0 ? (
          <p className="text-muted-foreground">No episodes yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortedEpisodes.map((ep) => (
              <VideoCard key={ep.id} video={ep} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}