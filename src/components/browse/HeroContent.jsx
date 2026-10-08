import React from "react";
import { Link } from "react-router-dom";
import { Play, Info, Layers, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function HeroContent({ slide, active, reducedMotion }) {
  const { type, data, items: itemCount } = slide;
  const collection = type === "franchise";
  const series = type === "series";
  const movie = type === "video";

  const title = collection ? data.title : series ? data.title : data.title;
  const info = collection ? `/franchise?id=${data.id}` : series ? `/series?id=${data.id}` : `/movie?id=${data.id}`;
  const playable = movie && data.video_url && !data.coming_soon;
  const watchHref = movie && playable ? `/watch?id=${data.id}` : info;

  const synopsis = data.description;
  const year = data.release_year || (data.release_date ? new Date(data.release_date).getFullYear() : null);
  const category = data.category && data.category.toLowerCase() !== "other" ? data.category : null;
  const updated = isRecentlyUpdated(toActivityTimestamp(data.content_updated_at)) || isRecentlyUpdated(slide.latestActivityAt);
  const fresh = !collection && isRecentlyUpdated(toActivityTimestamp(data.created_date));

  const metaParts = [];
  if (collection) metaParts.push("COLLECTION");
  else if (series) metaParts.push("TV SERIES");
  else metaParts.push("MOVIE");
  if (collection && itemCount) metaParts.push(`${itemCount} ${itemCount === 1 ? "Title" : "Titles"}`);
  if (series && data.franchise_id) metaParts.push("SERIES");
  if (year) metaParts.push(String(year));
  if (data.duration) metaParts.push(data.duration);
  if (category) metaParts.push(String(category).toUpperCase());

  return (
    <div className="home-hero-copy" style={{ opacity: active ? 1 : 0, transition: reducedMotion ? "none" : "opacity 500ms ease-in-out" }}>
      <div className="home-hero-kicker">Xero Cinema · Now Showing</div>
      <h1 className={`home-hero-title ${title.length > 28 ? "home-hero-title-long" : ""}`}>{title}</h1>
      <div className="home-hero-meta">
        {collection && <StatusBadge status="COLLECTION" />}
        {updated && <StatusBadge status={fresh ? "NEW" : "UPDATED"} />}
        {metaParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span aria-hidden="true" className="text-foreground/30">·</span>}
            <span>{part}</span>
          </React.Fragment>
        ))}
        {data.quality && data.quality !== "Unknown" && <StatusBadge status={data.quality} />}
      </div>
      {synopsis && <p className="home-hero-synopsis">{synopsis}</p>}
      <div className="home-hero-actions">
        {collection ? (
          <Button asChild className="home-hero-primary"><Link to={info}><Layers className="h-4 w-4" />View Collection</Link></Button>
        ) : series ? (
          <Button asChild className="home-hero-primary"><Link to={info}><Tv className="h-4 w-4" />Watch Series</Link></Button>
        ) : playable ? (
          <Button asChild className="home-hero-primary"><Link to={watchHref}><Play className="h-4 w-4 fill-current" />Watch Now</Link></Button>
        ) : (
          <Button asChild className="home-hero-primary"><Link to={info}><Info className="h-4 w-4" />More Info</Link></Button>
        )}
        {!collection && <WatchlistButton videoId={movie ? data.id : null} seriesId={series ? data.id : null} className="home-hero-secondary" label="My List" />}
        <Button asChild variant="ghost" className="home-hero-secondary home-hero-info"><Link to={info}><Info className="h-4 w-4" />More Info</Link></Button>
      </div>
    </div>
  );
}