import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Check } from "lucide-react";

/**
 * Preferred primary genre pills, pinned next to "All".
 * `label` is the short pill text; `value` is the canonical genre name used in data.
 */
const PRIMARY_GENRES = [
  { label: "Action", value: "Action" },
  { label: "Comedy", value: "Comedy" },
  { label: "Crime", value: "Crime" },
  { label: "Drama", value: "Drama" },
  { label: "Fantasy", value: "Fantasy" },
  { label: "Horror", value: "Horror" },
  { label: "Romance", value: "Romance" },
  { label: "Sci-Fi", value: "Science Fiction" },
  { label: "Thriller", value: "Thriller" },
  { label: "Animation", value: "Animation" },
  { label: "Adventure", value: "Adventure" },
  { label: "Documentary", value: "Documentary" },
];

/**
 * Hybrid genre filter: a single non-wrapping row with "All" + top primary pills,
 * followed by a "More Genres" dropdown containing every remaining genre (with search).
 * Only genres that have at least one published title are shown — the `genres`
 * prop is already filtered by the catalogue hook.
 */
export default function GenreFilter({ genres, active = undefined, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const available = useMemo(() => new Set(genres.map((g) => g.name)), [genres]);
  const primaryPills = useMemo(
    () => PRIMARY_GENRES.filter((p) => available.has(p.value)),
    [available]
  );
  const primaryValues = useMemo(
    () => new Set(PRIMARY_GENRES.map((p) => p.value)),
    []
  );
  const moreGenres = useMemo(
    () =>
      genres
        .filter((g) => !primaryValues.has(g.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [genres, primaryValues]
  );

  const filteredMore = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return moreGenres;
    return moreGenres.filter((g) => g.name.toLowerCase().includes(q));
  }, [moreGenres, query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!genres.length) return null;

  const chip =
    "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";
  const on = "border-primary bg-primary text-primary-foreground";
  const off = "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground";

  const activeInDropdown =
    active !== "all" && !primaryValues.has(active) && available.has(active);

  const select = (name) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div
        role="group"
        aria-label="Filter by genre"
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
      >
        <button
          type="button"
          aria-pressed={active === "all"}
          onClick={() => onChange("all")}
          className={cn(chip, active === "all" ? on : off)}
        >
          All
        </button>
        {primaryPills.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            aria-pressed={active === value}
            onClick={() => onChange(value)}
            className={cn(chip, active === value ? on : off)}
          >
            {label}
          </button>
        ))}
        {moreGenres.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              chip,
              "flex items-center gap-1",
              activeInDropdown || open ? on : off
            )}
          >
            {activeInDropdown ? active : "More Genres"}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-sm rounded-lg border border-border bg-popover shadow-xl">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search genres..."
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredMore.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No genres found
              </div>
            ) : (
              filteredMore.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => select(name)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    active === name
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-foreground"
                  )}
                >
                  <span>{name}</span>
                  <span className="flex items-center gap-2">
                    {active === name && <Check className="h-3.5 w-3.5" />}
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
