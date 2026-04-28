import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";

/**
 * A searchable series selector.
 * Props:
 *   seriesList   - array of series objects
 *   value        - selected series id
 *   onChange     - (id) => void
 *   label        - string label (default "Assign to Series")
 *   required     - bool
 */
export default function SeriesSearchSelect({ seriesList = [], value, onChange, label = "Assign to Series", required = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = seriesList.find(s => s.id === value);

  // Derive show name + season number suggestions
  // Group by "base name" (strip trailing "Season X" or "S0X")
  const filtered = query.trim()
    ? seriesList.filter(s => s.title.toLowerCase().includes(query.toLowerCase()))
    : seriesList;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <Label>{label}{required && " *"}</Label>}

      {selected && !open ? (
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <span className="flex-1 font-medium">{selected.title}</span>
          <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => { setQuery(""); setOpen(true); }} className="text-xs text-primary hover:underline">
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Type show name to search…"
            className="bg-secondary border-border pl-8"
            autoComplete="off"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onMouseDown={() => handleSelect(s.id)}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
          {open && query && filtered.length === 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
              No series found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}