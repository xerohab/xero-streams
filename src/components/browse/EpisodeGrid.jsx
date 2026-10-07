import React from "react";
import { cn } from "@/lib/utils";

/** Shared grid for every 16:9 EpisodeCard. Track widths live in index.css (.xero-episode-grid). */
export default function EpisodeGrid({ children, className }) {
  return <div className={cn("xero-episode-grid", className)}>{children}</div>;
}