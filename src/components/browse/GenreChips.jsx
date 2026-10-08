import React from "react";
import { getGenreList } from "@/lib/genreDisplay";

/**
 * Compact genre chips for detail pages.
 * Displays all applicable genres as small pills.
 */
export default function GenreChips({ record, legacyField, className = "" }) {
  const genres = getGenreList(record, legacyField);
  if (!genres.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {genres.map((g) => (
        <span
          key={g}
          className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground"
        >
          {g}
        </span>
      ))}
    </div>
  );
}