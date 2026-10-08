import React from "react";
import { Link } from "react-router-dom";
import { Play, X } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";

/** Same 2:3 poster as movie/series cards, with 16:9 reserved for Continue Watching. */
export default function EpisodeArtwork({ video, state, active, onRemove, landscape = false }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-secondary ${landscape ? "aspect-video w-[132px] rounded-md sm:w-full sm:rounded-none" : "aspect-[2/3] w-full"}`}>
      <Link to={state.href} onClick={state.handleClick} aria-label={`Play ${video.title}`} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Play className="h-6 w-6 text-muted-foreground/40" /></div>}
        {!state.isComingSoon && <div className="absolute inset-0 hidden items-center justify-center bg-background/40 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:flex"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="h-4 w-4 fill-current" /></span></div>}
      </Link>
      <div className="pointer-events-none absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
        {video.episode_number > 0 && <StatusBadge status={`EP ${video.episode_number}`} />}
        {state.isNew && <StatusBadge status="NEW" />}{state.isUpdated && <StatusBadge status="UPDATED" />}{state.isComingSoon && <StatusBadge status="Coming Soon" />}
      </div>
      {active && <div className="pointer-events-none absolute bottom-2 left-1.5"><StatusBadge status="Playing" /></div>}
      {state.inProgress && <div role="progressbar" aria-label="Viewing progress" aria-valuenow={state.watchedPct} aria-valuemin={0} aria-valuemax={100} className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-background/70"><div className="h-full bg-primary" style={{ width: `${state.watchedPct}%` }} /></div>}
      {onRemove && <button type="button" onClick={() => onRemove(video.id)} aria-label={`Remove ${video.title}`} className="absolute bottom-2 right-1.5 rounded-full border border-border bg-background/90 p-1 text-foreground"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}