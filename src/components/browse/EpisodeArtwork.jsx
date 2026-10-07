import React from "react";
import { Link } from "react-router-dom";
import { Play, X } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";

export default function EpisodeArtwork({ video, state, active, onRemove }) {
  return (
    <div className="relative aspect-video overflow-hidden border-b border-border/60 bg-secondary">
      <Link to={state.href} onClick={state.handleClick} aria-label={`Play ${video.title}`} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Play className="h-8 w-8 text-muted-foreground/40" /></div>}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/30" />
        {!state.isComingSoon && <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="h-4 w-4 fill-current" /></span></div>}
      </Link>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="flex gap-1">{video.episode_number > 0 && <StatusBadge status={`EP ${video.episode_number}`} />}{active && <StatusBadge status="Playing" />}</div>
        <div className="flex gap-1">{state.isNew && <StatusBadge status="NEW" />}{state.isUpdated && <StatusBadge status="UPDATED" />}{state.isComingSoon && <StatusBadge status="Coming Soon" />}</div>
      </div>
      {onRemove && <button type="button" onClick={() => onRemove(video.id)} aria-label={`Remove ${video.title}`} className="absolute bottom-2 right-2 rounded-full border border-border bg-background/90 p-1.5 text-foreground"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}