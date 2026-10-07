import React from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import EpisodeArtwork from "@/components/browse/EpisodeArtwork";
import EpisodeActions from "@/components/browse/EpisodeActions";
import useEpisodeCardState from "@/components/browse/useEpisodeCardState";

/** One compact episode shell shared by SeriesDetail, Watch and saved libraries. */
export default function EpisodeCard({ video, isPremium, watched = false, playable, href: hrefProp, onRemove, active = false }) {
  const state = useEpisodeCardState(video, { watched, playable, hrefProp });
  if (!video) return null;
  return (
    <article className={`xero-episode-card group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/60 focus-within:border-primary/60 ${active ? "border-primary/60" : "border-border"}`}>
      <EpisodeArtwork video={video} state={state} active={active} onRemove={onRemove} />
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        <Link to={state.href} onClick={state.handleClick} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight group-hover:text-primary">{video.title}</h3>
        </Link>
        <div className="mt-1.5 flex min-h-4 items-center gap-3 text-[11px] text-muted-foreground">
          {state.durationLabel && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{state.durationLabel}</span>}
          {state.isWatched && <span className="flex items-center gap-1"><Check className="h-3 w-3" />Watched</span>}
          {state.inProgress && <span className="text-primary">{state.watchedPct}% watched</span>}
        </div>
        {state.inProgress && <div role="progressbar" aria-label="Viewing progress" aria-valuenow={state.watchedPct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${state.watchedPct}%` }} /></div>}
        <EpisodeActions video={video} state={state} isPremium={isPremium} />
      </div>
    </article>
  );
}