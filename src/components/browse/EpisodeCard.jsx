import React from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import EpisodeArtwork from "@/components/browse/EpisodeArtwork";
import EpisodeActions from "@/components/browse/EpisodeActions";
import useEpisodeCardState from "@/components/browse/useEpisodeCardState";

/**
 * The only episode card (Series Detail, Watch, Continue Watching, My Profile).
 * Phones: compact horizontal row (thumbnail left, details right).
 * sm and up: compact landscape card, max 280px wide. Height always comes from content.
 */
export default function EpisodeCard({ video, isPremium, watched = false, playable, href: hrefProp, onRemove, active = false }) {
  const state = useEpisodeCardState(video, { watched, playable, hrefProp });
  if (!video) return null;
  const hasMeta = state.durationLabel || state.isWatched || state.inProgress;
  return (
    <article className={`xero-episode-card group relative flex flex-row items-start gap-2.5 overflow-hidden rounded-lg border bg-card p-2 transition-colors hover:border-primary/60 focus-within:border-primary/60 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0 ${active ? "border-primary/60" : "border-border"}`}>
      <EpisodeArtwork video={video} state={state} active={active} onRemove={onRemove} />
      <div className="flex min-w-0 flex-1 flex-col sm:flex-none sm:px-3 sm:pb-3 sm:pt-2.5">
        <Link to={state.href} onClick={state.handleClick} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug group-hover:text-primary sm:text-sm">{video.title}</h3>
        </Link>
        {hasMeta && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {state.durationLabel && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{state.durationLabel}</span>}
            {state.isWatched && <span className="flex items-center gap-1"><Check className="h-3 w-3" />Watched</span>}
            {state.inProgress && <span className="text-primary">{state.watchedPct}% watched</span>}
          </div>
        )}
        <EpisodeActions video={video} state={state} isPremium={isPremium} />
      </div>
    </article>
  );
}