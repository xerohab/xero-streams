import React from "react";
import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";
import HomeWelcome from "@/components/browse/HomeWelcome";

export default function HeroContent({ video, series, collection }) {
  const playable = video.video_url && !video.coming_soon;
  const title = series ? collection?.title || series.title.replace(/\s+(?:Season|Series)\s+\d+$/i, "") : video.title;
  const season = series?.title?.match(/(?:Series|Season)\s+(\d+)/i)?.[1];
  const info = series ? `/series?id=${series.id}` : `/movie?id=${video.id}`;
  const synopsis = video.description || series?.description || collection?.description;
  return (
    <div className="home-hero-copy">
      <div className="home-hero-kicker">Xero Cinema · Now Showing</div>
      <h1 className={`home-hero-title ${title.length > 28 ? "home-hero-title-long" : ""}`}>{title}</h1>
      {series && video.title !== title && <p className="home-hero-episode">{video.title}</p>}
      <div className="home-hero-meta">
        <span>{series ? "TV SERIES" : "MOVIE"}</span>
        {season && <span>SEASON {season}</span>}
        {(video.release_year || series?.release_year) && <span>{video.release_year || series.release_year}</span>}
        {video.duration && <span>{video.duration}</span>}
        {series?.category && <span className="uppercase">{series.category}</span>}
        {video.quality && video.quality !== "Unknown" && <StatusBadge status={video.quality} />}
      </div>
      {synopsis && <p className="home-hero-synopsis">{synopsis}</p>}
      <div className="home-hero-actions">
        <Button asChild className="home-hero-primary"><Link to={playable ? `/watch?id=${video.id}` : info}><Play className="h-4 w-4 fill-current" />{playable ? "Watch Now" : "Coming Soon"}</Link></Button>
        <WatchlistButton videoId={series ? null : video.id} seriesId={series?.id} className="home-hero-secondary" label="My List" />
        <Button asChild variant="ghost" className="home-hero-secondary home-hero-info"><Link to={info}><Info className="h-4 w-4" />More Info</Link></Button>
      </div>
      <HomeWelcome />
    </div>
  );
}