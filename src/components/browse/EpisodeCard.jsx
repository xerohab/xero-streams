import React from "react";
import { Link } from "react-router-dom";
import EpisodeArtwork from "@/components/browse/EpisodeArtwork";
import EpisodeActions from "@/components/browse/EpisodeActions";
import MediaHoverOverlay from "@/components/browse/MediaHoverOverlay";
import useEpisodeCardState from "@/components/browse/useEpisodeCardState";

/** Compact poster by default; Continue Watching explicitly keeps landscape artwork. */
export default function EpisodeCard({ video, isPremium, watched = false, playable, href: hrefProp, onRemove, active = false, landscape = false }) {
  const state = useEpisodeCardState(video, { watched, playable, hrefProp });
  if (!video) return null;
  const progressLabel = state.isWatched ? "Watched" : state.inProgress ? `${state.watchedPct}% watched` : null;
  const type = video.series_id || video.content_type === "episode" ? "episode" : "video";
  return (
    <MediaHoverOverlay item={{ ...video, duration: state.durationLabel }} type={type} isUpdated={state.isNew || state.isUpdated} isPremium={isPremium} playable={!state.isComingSoon} playHref={state.href} progressLabel={progressLabel} onDownload={(_, event) => state.handleDownload(event)} downloading={state.downloading} progress={state.progress}>
      <article className={`xero-episode-card group relative flex h-full overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/60 focus-within:border-primary/60 ${landscape ? "flex-row items-start gap-2.5 p-2 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0" : "flex-col"} ${active ? "border-primary/60" : "border-border"}`}>
        <EpisodeArtwork video={video} state={state} active={active} onRemove={onRemove} landscape={landscape} />
        <div className={`flex min-w-0 flex-1 flex-col ${landscape ? "sm:border-t sm:border-border/50 sm:px-2 sm:py-2" : "border-t border-border/50 px-2 py-2"}`}>
          <Link to={state.href} onClick={state.handleClick} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <h3 className="line-clamp-2 min-h-[2.4em] text-[11.5px] font-semibold leading-tight group-hover:text-primary group-focus-within:text-primary">{video.title}</h3>
          </Link>
          {landscape && progressLabel && <span className="mt-1 text-[9.5px] text-muted-foreground">{progressLabel}</span>}
          <EpisodeActions video={video} state={state} isPremium={isPremium} />
        </div>
      </article>
    </MediaHoverOverlay>
  );
}