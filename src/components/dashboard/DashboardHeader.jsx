import React from "react";
import { LogOut, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/browse/StatusBadge";

export default function DashboardHeader({ user, activeSub, activePlan, stats }) {
  return (
    <header className="flex flex-col gap-4 rounded-lg border border-border/60 bg-gradient-to-r from-card to-primary/5 p-4 md:p-5 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/15">
        <User className="h-6 w-6 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-black uppercase tracking-[0.12em] text-foreground md:text-2xl">My Xero</h1>
        <p className="truncate text-sm text-muted-foreground">Welcome back, {user.full_name || "User"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activeSub ? (
            <>
              <StatusBadge status="PREMIUM" />
              <span className="text-xs font-semibold text-muted-foreground">{activePlan?.name || "Pro"} Subscriber</span>
            </>
          ) : (
            <StatusBadge status="Free User" />
          )}
          <StatusBadge status={user.role} />
        </div>
      </div>

      <div className="flex items-center gap-5">
        {stats.map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-black text-primary">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => base44.auth.logout()}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </header>
  );
}