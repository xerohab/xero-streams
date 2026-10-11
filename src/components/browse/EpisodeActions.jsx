import React from "react";
import { Link } from "react-router-dom";
import { Play, Download, Loader2 } from "lucide-react";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Play / Resume plus the Premium download button. Always visible: nothing depends on hover. */
export default function EpisodeActions({ video, state, isPremium  = undefined}) {
  const canDownload = isPremium && !state.isComingSoon && video.video_url;
  return (
    <div className="mt-1 flex min-h-5 items-center justify-between gap-1">
      {state.isComingSoon
        ? <span className="text-[9.5px] font-semibold text-muted-foreground">Coming soon</span>
        : <Link to={state.href} onClick={state.handleClick} className={`inline-flex h-5 items-center gap-1 rounded px-1 text-[10px] font-bold text-primary hover:bg-primary/10 ${FOCUS}`}><Play className="h-3 w-3 fill-current" />{state.inProgress ? "Resume" : "Play"}</Link>}
      {canDownload && (
        <button type="button" onClick={state.handleDownload} disabled={state.downloading} aria-label={`Download ${video.title}`} title={`Download ${video.title}`} className={`inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded px-1 text-[9.5px] font-semibold text-muted-foreground transition-colors hover:text-primary disabled:opacity-100 ${FOCUS}`}>
          {state.downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {state.downloading && <span>{state.progress}%</span>}
        </button>
      )}
    </div>
  );
}
