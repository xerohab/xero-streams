import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

const SELECT = "h-10 min-w-0 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";
export default function BrowseControls({ catalog }) {
  return (
    <div className="mb-7 flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Filter by title" placeholder="Filter by title..." value={catalog.query} onChange={(e) => catalog.setQuery(e.target.value)} className="h-10 rounded-lg bg-background pl-9 text-sm" /></div>
      <div className="flex gap-2"><select aria-label="Genre" value={catalog.genre} onChange={(e) => catalog.setGenre(e.target.value)} className={SELECT}><option value="all">All genres</option>{catalog.genres.map((g) => <option key={g} value={g}>{g}</option>)}</select><select aria-label="Sort order" value={catalog.sort} onChange={(e) => catalog.setSort(e.target.value)} className={SELECT}><option value="latest">Latest activity</option><option value="title">Title A–Z</option></select></div>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><SlidersHorizontal className="h-3 w-3" />Collections first</span>
    </div>
  );
}