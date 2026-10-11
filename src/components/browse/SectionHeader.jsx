import React from "react";
import { cn } from "@/lib/utils";

/**
 * Xero Cinema section / page header: uppercase, tracked, with the gold marker.
 * level 1 = page title, level 2 = section title.
 */
export default function SectionHeader({ title, subtitle = undefined, action = undefined, level = 2, className  = undefined}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <Heading
          className={cn(
            "flex items-center gap-3 font-black uppercase tracking-[0.12em] text-foreground",
            level === 1 ? "text-2xl md:text-3xl" : "text-base md:text-lg"
          )}
        >
          <span className="h-5 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="min-w-0 truncate">{title}</span>
        </Heading>
        {subtitle && <p className="mt-1 pl-4 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action || null}
    </div>
  );
}
