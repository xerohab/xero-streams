import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Crown, Layers } from "lucide-react";

export default function StatusBadge({ status, className }) {
  if (!status) return null;
  const s = status.toUpperCase();

  switch (s) {
    case "UPDATED":
    case "NEW":
      return (
        <Badge className={cn("bg-primary/90 text-primary-foreground border-none text-[9px] sm:text-[10px] uppercase font-black tracking-widest px-1.5 shadow-lg", className)}>
          {s}
        </Badge>
      );
    case "COLLECTION":
      return (
        <Badge className={cn("bg-black/90 text-primary border border-primary/50 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider shadow-lg flex items-center gap-1", className)}>
          <Layers className="w-2.5 h-2.5" />
          COLLECTION
        </Badge>
      );
    case "EXCLUSIVE":
      return (
        <Badge className={cn("bg-primary/90 text-primary-foreground border-none text-[9px] sm:text-[10px] uppercase font-black tracking-widest shadow-lg px-1.5", className)}>
          EXCLUSIVE
        </Badge>
      );
    case "OWNED":
      return (
        <Badge className={cn("bg-black/90 text-primary border border-primary/50 text-[9px] sm:text-[10px] uppercase font-black tracking-widest shadow-lg px-1.5 flex items-center gap-1", className)}>
          <Check className="w-2.5 h-2.5" /> OWNED
        </Badge>
      );
    case "PREMIUM":
      return (
        <Badge className={cn("bg-black/90 text-primary border border-primary/50 text-[9px] sm:text-[10px] uppercase font-black tracking-widest shadow-lg px-1.5 flex items-center gap-1", className)}>
          <Crown className="w-2.5 h-2.5" /> PREMIUM
        </Badge>
      );
    default:
      return (
        <Badge className={cn("bg-black/80 backdrop-blur-md text-white border-none text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5", className)}>
          {s}
        </Badge>
      );
  }
}