import React from "react";
import { cn } from "@/lib/utils";

/** Shared grid for every poster (2:3) card. Track widths live in index.css (.xero-media-grid). */
export default function MediaGrid({ children, className }) {
  return <div className={cn("xero-media-grid", className)}>{children}</div>;
}