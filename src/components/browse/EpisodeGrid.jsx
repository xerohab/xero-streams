import React from "react";
import { cn } from "@/lib/utils";

/** Episode posters share movie/series tracks; Continue Watching keeps landscape phone rows. */
export default function EpisodeGrid({ children, className = undefined, landscape = false }) {
  return <div className={cn("xero-media-grid xero-episode-grid", landscape && "xero-continue-grid", className)}>{children}</div>;
}
