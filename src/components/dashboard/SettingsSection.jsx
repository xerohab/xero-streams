import React from "react";
import SectionHeader from "@/components/browse/SectionHeader";

const DEFAULT_ROWS = ["hero", "continue_watching", "latest", "tv", "movies"];
const ROW_OPTIONS = [
  { id: "hero", label: "Hero Banner (Featured)" },
  { id: "continue_watching", label: "Continue Watching" },
  { id: "latest", label: "Recently Added & Updated" },
  { id: "tv", label: "TV Series" },
  { id: "movies", label: "Movies" },
];

export default function SettingsSection({ user, onToggleRow }) {
  const rows = user.homepage_rows || DEFAULT_ROWS;

  return (
    <section>
      <SectionHeader title="Homepage Settings" subtitle="Choose what appears on your Home page." />
      <div className="max-w-xl space-y-3 rounded-xl border border-border bg-card p-6">
        {ROW_OPTIONS.map((row) => (
          <div key={row.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`row-${row.id}`}
              className="h-4 w-4 accent-primary"
              checked={rows.includes(row.id)}
              onChange={(e) => onToggleRow(row.id, e.target.checked)}
            />
            <label htmlFor={`row-${row.id}`} className="cursor-pointer text-sm">{row.label}</label>
          </div>
        ))}
      </div>
    </section>
  );
}