import React from "react";
import { Link } from "react-router-dom";
import { Play, Info, Layers, Tv, Download } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function MediaPreview({ item, type, isUpdated, isPremium, onDownload }) {
  const collection = type === "franchise";
  const series = type === "series";
  const playable = item.video_url && !item.coming_soon;
  const info = collection ? `/franchise?id=${item.id}` : series ? `/series?id=${item.id}` : `/movie?id=${item.id}`;
  const Icon = collection ? Layers : series ? Tv : Play;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">{collection && <StatusBadge status="COLLECTION" />}{isUpdated && <StatusBadge status={!collection && isRecentlyUpdated(toActivityTimestamp(item.created_date)) ? "NEW" : "UPDATED"} />}{item.is_adult && <StatusBadge status="18+" />}</div>
      <h3 className="text-lg font-bold leading-tight text-foreground">{item.title}</h3>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{item.release_year && <span>{item.release_year}</span>}{item.duration && <span>· {item.duration}</span>}{item.category && <span className="capitalize">· {item.category}</span>}{item.quality && item.quality !== "Unknown" && <StatusBadge status={item.quality} />}</div>
      {item.description && <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Link to={!collection && !series && playable ? `/watch?id=${item.id}` : info} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"><Icon className="h-4 w-4" />{collection ? "View Collection" : series ? "View Series" : playable ? "Watch Now" : "More Info"}</Link>
        {!collection && <Link to={info} aria-label="More information" className="rounded-lg border border-border bg-secondary p-2.5 text-foreground hover:border-primary"><Info className="h-4 w-4" /></Link>}
        {onDownload && isPremium && playable && <button onClick={() => onDownload(item)} aria-label="Download" className="rounded-lg border border-border bg-secondary p-2.5 text-primary"><Download className="h-4 w-4" /></button>}
      </div>
      {!collection && <WatchlistButton videoId={series ? null : item.id} seriesId={series ? item.id : null} label="My List" className="h-8 w-full gap-2 rounded-lg border-border bg-secondary text-xs" />}
    </div>
  );
}