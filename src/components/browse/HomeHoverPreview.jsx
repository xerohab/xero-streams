import React from "react";
import { Link } from "react-router-dom";
import { Info, Layers, Play, Tv } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { genreString } from "@/lib/genreDisplay";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function HomeHoverPreview({ item, type, isUpdated = undefined, itemCount = undefined }) {
  const collection = type === "franchise";
  const series = type === "series";
  const episode = !collection && !series && (type === "episode" || item.content_type === "episode" || !!item.series_id);
  const playable = !collection && !series && item.video_url && !item.coming_soon;
  const info = collection ? `/franchise?id=${item.id}` : series ? `/series?id=${item.id}` : episode ? `/watch?id=${item.id}` : `/movie?id=${item.id}`;
  const image = item.backdrop_url || item.cover_image || item.thumbnail_url;
  const Icon = collection ? Layers : series ? Tv : Play;
  const genres = genreString(item, "category", 4);
  return (
    <div className="home-hover-preview">
      {image && <div className="home-hover-artwork"><img src={image} alt="" /><div /></div>}
      <div className="home-hover-content">
        <div className="flex flex-wrap gap-1.5">{collection && <StatusBadge status="COLLECTION" />}{episode && item.episode_number > 0 && <StatusBadge status={`EP ${item.episode_number}`} />}{isUpdated && <StatusBadge status={!collection && isRecentlyUpdated(toActivityTimestamp(item.created_date)) ? "NEW" : "UPDATED"} />}{item.quality && item.quality !== "Unknown" && <StatusBadge status={item.quality} />}</div>
        <h3>{item.title}</h3>
        <div className="home-hover-meta">{collection ? `${itemCount} ${itemCount === 1 ? "Title" : "Titles"}` : item.release_year || (series ? "TV Series" : episode ? "Episode" : "Movie")}{genres && <span> · {genres}</span>}{item.duration && <span> · {item.duration}</span>}</div>
        {item.description && <p className="line-clamp-3">{item.description}</p>}
        <div className="home-hover-actions">
          <Link to={playable ? `/watch?id=${item.id}` : info} className="home-hover-primary"><Icon className="h-4 w-4" />{collection ? "View Collection" : series ? "View Series" : playable ? "Watch Now" : "More Info"}</Link>
          <Link to={info} aria-label="More information" className="home-hover-info"><Info className="h-4 w-4" /></Link>
        </div>
        {!collection && <WatchlistButton seriesId={series ? item.id : null} videoId={series ? null : item.id} label="My List" className="h-9 w-full border-border bg-secondary text-xs" />}
      </div>
    </div>
  );
}
