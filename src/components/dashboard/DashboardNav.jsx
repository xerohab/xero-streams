import React from "react";
import { cn } from "@/lib/utils";

export default function DashboardNav({ tabs, active, onChange }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0" aria-label="My Xero sections">
      <div className="flex w-max min-w-full gap-1 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              active === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
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