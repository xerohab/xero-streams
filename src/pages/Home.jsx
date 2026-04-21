import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import HeroSection from "@/components/browse/HeroSection";
import VideoRow from "@/components/browse/VideoRow";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const isLoading = loadingVideos || loadingSeries;

  // Featured video for hero
  const featuredVideo = videos.find((v) => v.is_featured) || videos[0];
  const featuredSeriesTitle = featuredVideo?.series_id
    ? seriesList.find((s) => s.id === featuredVideo.series_id)?.title
    : null;

  // Group videos by series
  const seriesRows = seriesList
    .map((series) => ({
      title: series.title,
      videos: videos
        .filter((v) => v.series_id === series.id)
        .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0)),
    }))
    .filter((row) => row.videos.length > 0);

  // Ungrouped videos
  const ungroupedVideos = videos.filter(
    (v) => !v.series_id || !seriesList.some((s) => s.id === v.series_id)
  );

  // Recently added
  const recentVideos = [...videos].slice(0, 15);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No videos yet</h2>
          <p className="text-muted-foreground">Content is coming soon. Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection video={featuredVideo} seriesTitle={featuredSeriesTitle} />

      <div className="-mt-16 relative z-10 pb-16">
        {/* Recently Added */}
        {recentVideos.length > 0 && (
          <VideoRow title="Recently Added" videos={recentVideos} />
        )}

        {/* Series rows */}
        {seriesRows.map((row) => (
          <VideoRow key={row.title} title={row.title} videos={row.videos} />
        ))}

        {/* Standalone videos */}
        {ungroupedVideos.length > 0 && (
          <VideoRow title="More Videos" videos={ungroupedVideos} />
        )}
      </div>
    </div>
  );
}