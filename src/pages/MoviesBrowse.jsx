import React from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "@/components/browse/VideoCard";
import { Loader2 } from "lucide-react";

export default function MoviesBrowse() {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["movies_browse"],
    queryFn: () => base44.entities.Video.filter({ content_type: "movie", is_adult: false }, "-created_date")
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-28 px-6 md:px-12 max-w-[1800px] mx-auto min-h-[70vh]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Movies</h1>
          <p className="text-muted-foreground mt-2 text-lg">Browse our latest cinematic releases.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-foreground">No Movies Found</h3>
            <p className="text-muted-foreground">Check back later for new additions.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}