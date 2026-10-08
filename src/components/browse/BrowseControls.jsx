import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import GenreFilter from "@/components/browse/GenreFilter";

export default function BrowseControls({ catalog }) {
  const filtered = catalog.genre !== "all" || !!catalog.query;
  return (
    <div className="mb-6">
      <GenreFilter genres={catalog.genres} active={catalog.genre} onChange={catalog.setGenre} />
      <div className="xero-filter-bar">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Filter by title" placeholder="Filter by title..." value={catalog.query} onChange={(e) => catalog.setQuery(e.target.value)} className="h-9 rounded-lg bg-background pl-9 text-sm" /></div>
        <div className="flex items-center gap-2">
          <select aria-label="Sort order" value={catalog.sort} onChange={(e) => catalog.setSort(e.target.value)} className="xero-filter-select"><option value="latest">Latest activity</option><option value="title">Title A–Z</option></select>
          {filtered && <button type="button" onClick={catalog.clearFilters} className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"><X className="h-3.5 w-3.5" />Clear</button>}
        </div>
      </div>
    </div>
  );
}