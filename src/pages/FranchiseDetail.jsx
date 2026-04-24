import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Film, Loader2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";

export default function FranchiseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const franchiseId = urlParams.get("id");

  const { data: franchise, isLoading: loadingFranchise } = useQuery({
    queryKey: ["franchise", franchiseId],
    queryFn: async () => {
      const list = await base44.entities.Franchise.filter({ id: franchiseId });
      return list[0];
    },
    enabled: !!franchiseId,
  });

  const { data: allSeries = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: allVideos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const franchiseSeries = allSeries
    .filter((s) => s.franchise_id === franchiseId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const franchiseMovies = allVideos.filter(
    (v) => v.franchise_id === franchiseId && (!v.series_id)
  );

  const episodeCountBySeries = (seriesId) =>
    allVideos.filter((v) => v.series_id === seriesId).length;

  if (loadingFranchise || loadingSeries || loadingVideos) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!franchise) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-foreground mb-2">Franchise not found</h2>
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
          franchise.cover_image
            ? { backgroundImage: `url(${franchise.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" }
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
          <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Franchise</p>
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2">{franchise.title}</h1>
          {franchise.description && (
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed">
              {franchise.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 md:px-16 py-10 space-y-12">
        {/* Series within franchise */}
        {franchiseSeries.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" /> Series
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {franchiseSeries.map((s) => (
                <SeriesCard key={s.id} series={s} episodeCount={episodeCountBySeries(s.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Standalone movies within franchise */}
        {franchiseMovies.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {franchiseMovies.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}

        {franchiseSeries.length === 0 && franchiseMovies.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No content in this franchise yet.</div>
        )}
      </div>
    </div>
  );
}