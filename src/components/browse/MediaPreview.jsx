import React from "react";
import { Link } from "react-router-dom";
import { Play, Info, Layers, Tv, Download, Loader2 } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { genreString } from "@/lib/genreDisplay";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function MediaPreview({ item, type, isUpdated = undefined, isPremium = undefined, onDownload = undefined, playHref = undefined, playable: canPlay = undefined, progressLabel = undefined, downloading = undefined, progress = undefined }) {
  const collection = type === "franchise";
  const series = type === "series";
  const episode = !collection && !series && (type === "episode" || item.content_type === "episode" || !!item.series_id);
  const playable = canPlay ?? (!!item.video_url && !item.coming_soon);
  const info = collection ? `/franchise?id=${item.id}` : series ? `/series?id=${item.id}` : episode ? `/watch?id=${item.id}` : `/movie?id=${item.id}`;
  const Icon = collection ? Layers : series ? Tv : Play;
  const genres = genreString(item, "category", 4);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {collection && <StatusBadge status="COLLECTION" />}
        {episode && item.episode_number > 0 && <StatusBadge status={`EP ${item.episode_number}`} />}
        {isUpdated && <StatusBadge status={!collection && isRecentlyUpdated(toActivityTimestamp(item.created_date)) ? "NEW" : "UPDATED"} />}
        {!collection && !series && !playable && <StatusBadge status="Coming Soon" />}
        {item.is_adult && <StatusBadge status="18+" />}
      </div>
      <h3 className="text-base font-bold leading-tight text-foreground">{item.title}</h3>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {item.release_year && <span>{item.release_year}</span>}
        {item.duration && <span>· {item.duration}</span>}
        {genres && <span>· {genres}</span>}
        {item.quality && item.quality !== "Unknown" && <StatusBadge status={item.quality} />}
      </div>
      {progressLabel && <p className="text-xs font-semibold text-primary">{progressLabel}</p>}
      {item.description && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
      <div className="flex items-center gap-2 border-t border-border pt-2.5">
        <Link to={!collection && !series && playable ? playHref || `/watch?id=${item.id}` : info} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
          <Icon className="h-4 w-4" />{collection ? "View Collection" : series ? "View Series" : playable ? "Watch Now" : "More Info"}
        </Link>
        {!collection && (
          <Link to={info} aria-label="More information" className="rounded-lg border border-border bg-secondary p-2 text-foreground hover:border-primary">
            <Info className="h-4 w-4" />
          </Link>
        )}
        {onDownload && isPremium && playable && item.video_url && (
          <button type="button" onClick={(event) => onDownload(item, event)} disabled={downloading} aria-label={`Download ${item.title}`} className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-2 text-primary disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading && <span className="text-[10px]">{progress}%</span>}
          </button>
        )}
      </div>
      {!collection && <WatchlistButton videoId={series ? null : item.id} seriesId={series ? item.id : null} label="My List" className="h-8 w-full gap-2 rounded-lg border-border bg-secondary text-xs" />}
    </div>
  );
}
