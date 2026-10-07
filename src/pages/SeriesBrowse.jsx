import React from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SeriesCard from "@/components/browse/SeriesCard";
import { Loader2 } from "lucide-react";

export default function SeriesBrowse() {
  const { data: series = [], isLoading } = useQuery({
    queryKey: ["series_browse"],
    queryFn: () => base44.entities.Series.filter({ is_adult: false }, "-created_date")
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-28 px-6 md:px-12 max-w-[1800px] mx-auto min-h-[70vh]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">TV Series</h1>
          <p className="text-muted-foreground mt-2 text-lg">Binge-worthy shows and collections.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : series.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {series.map(s => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-foreground">No Series Found</h3>
            <p className="text-muted-foreground">Check back later for new additions.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}