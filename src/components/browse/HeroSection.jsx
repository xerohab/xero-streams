import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HeroContent from "@/components/browse/HeroContent";

export default function HeroSection({ videos = [], seriesList = [], franchises = [] }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % videos.length), 6000);
    return () => clearInterval(timer);
  }, [videos.length]);
  if (!videos.length) return null;
  const index = current % videos.length;
  const video = videos[index];
  const series = seriesList.find((s) => s.id === video.series_id);
  const collection = franchises.find((f) => f.id === series?.franchise_id);
  const ncisBackdrop = "https://image.tmdb.org/t/p/original/c1aBrG5s5xFa6Tbnihu2Hhj4t2q.jpg";
  const backdrop = video.backdrop_url || series?.backdrop_url || collection?.backdrop_url || (collection?.title === "NCIS" ? ncisBackdrop : video.thumbnail_url || series?.cover_image);
  return (
    <header className="home-hero" aria-label="Featured title">
      {backdrop && <img src={backdrop} alt="" aria-hidden="true" fetchPriority="high" className="home-hero-artwork" />}
      <div className="home-hero-shade" />
      <div className="home-hero-left" />
      <div className="home-hero-bottom" />
      <div className="home-container home-hero-inner"><HeroContent video={video} series={series} collection={collection} /></div>
      {videos.length > 1 && <div className="home-hero-pagination">
        <div className="flex gap-2">{videos.map((v, i) => <button key={v.id} onClick={() => setCurrent(i)} aria-label={`Show ${v.title}`} aria-pressed={index === i} className={`h-1.5 rounded-full ${index === i ? "w-8 bg-primary" : "w-4 bg-foreground/30"}`} />)}</div>
        <div className="flex gap-2"><button onClick={() => setCurrent((index - 1 + videos.length) % videos.length)} aria-label="Previous featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setCurrent((index + 1) % videos.length)} aria-label="Next featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary"><ChevronRight className="h-4 w-4" /></button></div>
      </div>}
    </header>
  );
}