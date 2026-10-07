import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Download as DownloadIcon, Check, Clock, X } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";
import { getProgress } from "@/hooks/useContinueWatching";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";
import toast from "react-hot-toast";

/**
 * The single 16:9 episode card used by SeriesDetail, Watch, Continue Watching,
 * and My Xero (Continue / My List / History).
 *
 * Optional props (for entries that are not full Video records, e.g. Continue Watching):
 *  - playable: force playable state
 *  - href: override destination
 *  - onRemove: shows a remove button
 *  - watched: force the "Watched" state
 */
export default function EpisodeCard({ video, isPremium, watched = false, playable, href: hrefProp, onRemove }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!video) return null;
  const isComingSoon = playable === undefined ? video.coming_soon || !video.video_url : !playable;
  const href = hrefProp || `/watch?id=${video.id}`;

  const savedProgress = getProgress(video.id);
  const watchedPct =
    savedProgress && savedProgress.duration
      ? Math.min(100, Math.round((savedProgress.currentTime / savedProgress.duration) * 100))
      : 0;
  const isWatched = watched || watchedPct > 90;
  const inProgress = !!savedProgress && !isWatched;

  const isNew = isRecentlyUpdated(toActivityTimestamp(video.created_date));
  const isUpdated = !isNew && isRecentlyUpdated(toActivityTimestamp(video.content_updated_at));
  const canDownload = isPremium && !isComingSoon && !!video.video_url;

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setProgress(0);
    const toastId = toast.loading(`Preparing download for ${video.title}...`);
    try {
      await downloadSingleVideo(video.id, (p) => {
        setProgress(p);
        if (p < 100) {
          toast.loading(`Downloading... ${p}%`, { id: toastId });
        }
      });
      toast.success("Download complete!", { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (!isComingSoon) navigate(href);
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(video.id);
  };

  return (
    <div className="group relative w-full max-w-[300px]">
      <Link
        to={href}
        onClick={handleClick}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-video overflow-hidden rounded-lg bg-card ring-1 ring-border transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/70 group-hover:ring-primary/70 group-focus-within:ring-primary/70"
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
            <Play className="h-8 w-8 opacity-20" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

        {!isComingSoon && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-lg shadow-black/60">
              <Play className="h-3.5 w-3.5 fill-current" />
              {inProgress ? "Resume" : "Play"}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1">
          {video.episode_number ? <StatusBadge status={`EP ${video.episode_number}`} /> : null}
          {isNew && <StatusBadge status="NEW" />}
          {isUpdated && <StatusBadge status="UPDATED" />}
          {isComingSoon && <StatusBadge status="Coming Soon" />}
        </div>

        {inProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div className="h-full bg-primary" style={{ width: `${watchedPct}%` }} />
          </div>
        )}
      </Link>

      {canDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={`Download ${video.title}`}
          className="absolute right-2 top-2 z-20 flex h-8 min-w-8 items-center justify-center rounded-full border border-white/15 bg-black/75 px-1 text-primary opacity-0 shadow-lg backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          {downloading ? <span className="px-1 text-[10px] font-bold">{progress}%</span> : <DownloadIcon className="h-4 w-4" />}
        </button>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${video.title}`}
          className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white opacity-0 transition-opacity hover:bg-black focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <Link to={href} onClick={handleClick} className="mt-2 block rounded outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {video.title}
        </h3>
        {(video.duration || isWatched || inProgress) && (
          <p className="mt-0.5 flex items-center gap-2.5 text-[11px] font-medium text-muted-foreground">
            {video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {video.duration}
              </span>
            )}
            {isWatched && (
              <span className="flex items-center gap-1 text-primary">
                <Check className="h-3 w-3" />
                Watched
              </span>
            )}
            {inProgress && <span className="text-primary">{watchedPct}% watched</span>}
          </p>
        )}
      </Link>
    </div>
  );
}