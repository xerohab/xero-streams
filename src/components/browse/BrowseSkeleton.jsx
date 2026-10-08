import React from "react";
import MediaGrid from "@/components/browse/MediaGrid";

/** Poster-shaped loading placeholders for the catalogue grid. */
export default function BrowseSkeleton({ count = 14 }) {
  return (
    <div role="status" aria-label="Loading catalogue">
      <MediaGrid>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="xero-media-card animate-pulse overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-[2/3] bg-secondary" />
            <div className="space-y-2 p-2.5"><div className="h-3 w-4/5 rounded bg-secondary" /><div className="h-2.5 w-1/2 rounded bg-secondary" /></div>
          </div>
        ))}
      </MediaGrid>
    </div>
  );
}