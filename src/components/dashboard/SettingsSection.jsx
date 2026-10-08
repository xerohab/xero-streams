import React from "react";
import SectionHeader from "@/components/browse/SectionHeader";
import { Switch } from "@/components/ui/switch";

const DEFAULT_ROWS = ["hero", "continue_watching", "latest", "tv", "movies"];
const ROW_OPTIONS = [
  { id: "hero", label: "Hero Banner (Featured)" },
  { id: "continue_watching", label: "Continue Watching" },
  { id: "latest", label: "Recently Added & Updated" },
  { id: "tv", label: "TV Series" },
  { id: "movies", label: "Movies" },
];

export default function SettingsSection({ user, onToggleRow, onToggleDigest }) {
  const rows = user.homepage_rows || DEFAULT_ROWS;

  return (
    <section>
      <SectionHeader title="Homepage Settings" subtitle="Choose what appears on your Home page." />
      <div className="max-w-xl space-y-3 rounded-lg border border-border/60 bg-card/40 p-5">
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

      <div className="mt-6">
        <SectionHeader title="Email Preferences" subtitle="Manage your notification emails." />
        <div className="max-w-xl rounded-lg border border-border/60 bg-card/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Weekly Content Digest</p>
              <p className="text-xs text-muted-foreground">Get a weekly email about new movies, series, and episodes added to Xero Streams.</p>
            </div>
            <Switch
              checked={!user.weekly_digest_opt_out}
              onCheckedChange={(checked) => onToggleDigest?.(!checked)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}