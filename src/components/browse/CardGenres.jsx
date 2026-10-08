import React from "react";
import { getGenreList, genreString } from "@/lib/genreDisplay";

/**
 * Compact multi-genre display for card footers.
 * Shows up to 2 genres with +N indicator for more.
 */
export default function CardGenres({ record, legacyField, max = 2 }) {
  const genres = getGenreList(record, legacyField);
  if (!genres.length) return null;
  const shown = genres.slice(0, max);
  const extra = genres.length - max;
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
      {shown.map((g, i) => (
        <React.Fragment key={g}>
          {i > 0 && <span aria-hidden="true" className="px-0.5">·</span>}
          <span className="truncate">{g}</span>
        </React.Fragment>
      ))}
      {extra > 0 && <span className="pl-0.5 text-muted-foreground/70">+{extra}</span>}
    </span>
  );
}