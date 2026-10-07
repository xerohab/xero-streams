import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Crown, Layers } from "lucide-react";

const BASE =
  "inline-flex items-center gap-1 rounded px-1.5 py-[3px] text-[9px] sm:text-[10px] font-black uppercase leading-none tracking-wider shadow-lg shadow-black/40";
const SOLID = "bg-primary text-primary-foreground";
const OUTLINE = "border border-primary/50 bg-black/85 text-primary";
const NEUTRAL = "bg-black/80 text-white backdrop-blur-sm";

/**
 * Single source of truth for every semantic label in the Xero Cinema system:
 * UPDATED, NEW, COLLECTION, EXCLUSIVE, OWNED, PREMIUM, COMING SOON, EP n, 18+.
 */
export default function StatusBadge({ status, className }) {
  if (!status) return null;
  const s = String(status).toUpperCase();

  let tone = NEUTRAL;
  let icon = null;

  if (s === "UPDATED" || s === "NEW" || s === "EXCLUSIVE") {
    tone = SOLID;
  } else if (s === "COLLECTION") {
    tone = OUTLINE;
    icon = <Layers className="h-2.5 w-2.5" />;
  } else if (s === "OWNED") {
    tone = OUTLINE;
    icon = <Check className="h-2.5 w-2.5" />;
  } else if (s === "PREMIUM") {
    tone = OUTLINE;
    icon = <Crown className="h-2.5 w-2.5" />;
  } else if (s === "COMING SOON") {
    tone = OUTLINE;
    icon = <Clock className="h-2.5 w-2.5" />;
  } else if (s.startsWith("EP ")) {
    tone = OUTLINE;
  } else if (s === "18+") {
    tone = "bg-red-600 text-white";
  }

  return (
    <span className={cn(BASE, tone, className)}>
      {icon}
      {s}
    </span>
  );
}