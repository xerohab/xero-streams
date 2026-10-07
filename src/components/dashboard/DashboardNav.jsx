import React from "react";
import { cn } from "@/lib/utils";

export default function DashboardNav({ tabs, active, onChange }) {
  return (
    <nav className="overflow-x-auto rounded-xl border border-border bg-card p-2 scrollbar-hide lg:sticky lg:top-24" aria-label="My Xero sections">
      <div className="flex w-max min-w-full gap-1 lg:w-full lg:flex-col">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-3 text-xs font-semibold transition-colors",
              active === id ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}