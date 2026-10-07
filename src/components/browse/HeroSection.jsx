import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HeroContent from "@/components/browse/HeroContent";

export default function HeroSection({ videos = [], seriesList = [] }) {
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
  return (
    <header className="relative isolate min-h-[460px] overflow-hidden border-b border-border bg-background md:min-h-[540px]">
      {video.thumbnail_url && <img src={video.backdrop_url || video.thumbnail_url} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-top opacity-70" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/15" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/20 to-background/40" />
      <div className="xero-container flex min-h-[460px] items-center pb-16 pt-28 md:min-h-[540px] md:py-28"><HeroContent video={video} series={series} /></div>
      {videos.length > 1 && <div className="xero-container absolute inset-x-0 bottom-6 flex items-center justify-between gap-4">
        <div className="flex gap-2">{videos.map((v, i) => <button key={v.id} onClick={() => setCurrent(i)} aria-label={`Show ${v.title}`} aria-pressed={index === i} className={`h-1.5 rounded-full ${index === i ? "w-8 bg-primary" : "w-4 bg-foreground/30"}`} />)}</div>
        <div className="flex gap-2"><button onClick={() => setCurrent((index - 1 + videos.length) % videos.length)} aria-label="Previous featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setCurrent((index + 1) % videos.length)} aria-label="Next featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary"><ChevronRight className="h-4 w-4" /></button></div>
      </div>}
    </header>
  );
}