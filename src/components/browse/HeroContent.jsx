import React from "react";
import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";

export default function HeroContent({ video, series }) {
  const playable = video.video_url && !video.coming_soon;
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Xero Cinema</span><StatusBadge status={series ? "TV Series" : "Movie"} /></div>
      {series && <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{series.title}</p>}
      <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl">{video.title}</h1>
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">{video.release_year && <span>{video.release_year}</span>}{video.duration && <span>{video.duration}</span>}{series?.category && <span className="capitalize">{series.category}</span>}{video.quality && video.quality !== "Unknown" && <StatusBadge status={video.quality} />}</div>
      {video.description && <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-foreground/75 md:text-base">{video.description}</p>}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button asChild className="h-11 gap-2 rounded-lg px-6 text-xs font-bold uppercase tracking-wider"><Link to={playable ? `/watch?id=${video.id}` : series ? `/series?id=${series.id}` : `/movie?id=${video.id}`}><Play className="h-4 w-4 fill-current" />{playable ? "Watch Now" : "Coming Soon"}</Link></Button>
        <WatchlistButton videoId={video.id} className="xero-action text-xs uppercase tracking-wider" label="My List" />
        <Button asChild variant="secondary" className="xero-action text-xs uppercase tracking-wider"><Link to={series ? `/series?id=${series.id}` : `/movie?id=${video.id}`}><Info className="h-4 w-4" />More Info</Link></Button>
      </div>
    </div>
  );
}