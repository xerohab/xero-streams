import React from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

const GENRES = [
  ["action", "Action"], ["comedy", "Comedy"], ["drama", "Drama"], ["documentary", "Documentary"],
  ["horror", "Horror"], ["sci-fi", "Sci-Fi"], ["thriller", "Thriller"], ["education", "Education"],
  ["music", "Music"], ["crime", "Crime"], ["mystery", "Mystery"], ["fantasy", "Fantasy"],
  ["romance", "Romance"], ["animation", "Animation"], ["adventure", "Adventure"], ["other", "Other"],
];

/** Xero Cinema search bar + filters. State lives in the Search page. */
export default function SearchFilters({
  query, onQuery, filterType, onType, filterCategory, onCategory,
  filterYear, onYear, filterCast, onCast, showAdvanced, onToggleAdvanced, categories,
}) {
  return (
    <div className="xero-filter-bar mb-6 max-w-5xl">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-[2]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search movies, TV shows, collections, books..."
            className="h-9 w-full rounded-lg bg-background pl-10 text-sm focus-visible:ring-primary"
          />
        </div>
        <div className="flex flex-1 gap-2">
          <select value={filterType} onChange={(e) => onType(e.target.value)} className="xero-filter-select flex-1">
            <option value="all">All Types</option>
            <option value="movies">Movies</option>
            <option value="series">TV Series</option>
            <option value="books">Books</option>
          </select>
          <select value={filterCategory} onChange={(e) => onCategory(e.target.value)} className="xero-filter-select flex-1">
            <option value="all">All Genres</option>
            {GENRES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            onClick={onToggleAdvanced}
            aria-label="Advanced filters"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              showAdvanced ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-col gap-3 pt-1 animate-in fade-in slide-in-from-top-2 md:flex-row">
          <Input value={filterYear} onChange={(e) => onYear(e.target.value)} placeholder="Release Year" type="number" className="h-9 flex-1 rounded-lg border-border bg-background px-3 text-sm" />
          <Input value={filterCast} onChange={(e) => onCast(e.target.value)} placeholder="Search by Cast Member" className="h-9 flex-[2] rounded-lg border-border bg-background px-3 text-sm" />
        </div>
      )}
    </div>
  );
}