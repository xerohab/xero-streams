import React from "react";
import { Link } from "react-router-dom";
import { Play, Download, Loader2 } from "lucide-react";

export default function EpisodeActions({ video, state, isPremium }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[11px] font-semibold">
      {state.isComingSoon ? <span className="text-muted-foreground">Coming soon</span> : <Link to={state.href} onClick={state.handleClick} className="flex items-center gap-1.5 rounded text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"><Play className="h-3.5 w-3.5 fill-current" />{state.inProgress ? "Resume" : "Play"}</Link>}
      {isPremium && !state.isComingSoon && video.video_url && <button type="button" onClick={state.handleDownload} disabled={state.downloading} aria-label={`Download ${video.title}`} className="flex items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-100 [@media(hover:none)]:opacity-100">{state.downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}{state.downloading ? `${state.progress}%` : "Download"}</button>}
    </div>
  );
}