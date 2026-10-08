import React from "react";
import { Link } from "react-router-dom";
import { Play, Download, Loader2 } from "lucide-react";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Play / Resume plus the Premium download button. Always visible: nothing depends on hover. */
export default function EpisodeActions({ video, state, isPremium }) {
  const canDownload = isPremium && !state.isComingSoon && video.video_url;
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      {state.isComingSoon
        ? <span className="text-[11px] font-semibold text-muted-foreground">Coming soon</span>
        : <Link to={state.href} onClick={state.handleClick} className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS}`}><Play className="h-3.5 w-3.5 fill-current" />{state.inProgress ? "Resume" : "Play"}</Link>}
      {canDownload && (
        <button type="button" onClick={state.handleDownload} disabled={state.downloading} aria-label={`Download ${video.title}`} className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-100 ${FOCUS}`}>
          {state.downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className={state.downloading ? "" : "hidden sm:inline"}>{state.downloading ? `${state.progress}%` : "Download"}</span>
        </button>
      )}
    </div>
  );
}