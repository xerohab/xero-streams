import React from "react";
import { cn } from "@/lib/utils";

/** Genre chips: horizontally scrollable on phones, wrapping on larger screens. Active chip is Xero gold. */
export default function GenreFilter({ genres, active, onChange }) {
  if (!genres.length) return null;
  const chip = "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";
  const on = "border-primary bg-primary text-primary-foreground";
  const off = "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground";
  return (
    <div role="group" aria-label="Filter by genre" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <button type="button" aria-pressed={active === "all"} onClick={() => onChange("all")} className={cn(chip, active === "all" ? on : off)}>All</button>
      {genres.map(({ name }) => (
        <button key={name} type="button" aria-pressed={active === name} onClick={() => onChange(name)} className={cn(chip, active === name ? on : off)}>{name}</button>
      ))}
    </div>
  );
}