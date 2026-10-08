import React, { useState, useEffect, useRef } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Info } from "lucide-react";
import MediaPreview from "@/components/browse/MediaPreview";
import HomeHoverPreview from "@/components/browse/HomeHoverPreview";

/** Portalled information above each card: hover/focus, or an information button on touch. */
export default function MediaHoverOverlay({ children, cinema = false, ...props }) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const contentRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setDesktop(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !contentRef.current?.contains(event.target) && !event.target.closest('[role="dialog"]')) setOpen(false);
    };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const blur = (event) => {
    if (!contentRef.current?.contains(event.relatedTarget) && !triggerRef.current?.contains(event.relatedTarget) && !event.relatedTarget?.closest('[role="dialog"]')) setOpen(false);
  };
  return (
    <HoverCardPrimitive.Root open={open} onOpenChange={(next) => { if (desktop) setOpen(next); }} openDelay={250} closeDelay={180}>
      <HoverCardPrimitive.Trigger ref={triggerRef} asChild onFocus={() => { if (desktop) setOpen(true); }} onBlur={blur}>
        <div className="relative h-full min-w-0">
          {children}
          <button type="button" aria-label={`Information about ${props.item.title}`} aria-expanded={open} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((current) => !current); }} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background/90 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)_and_(pointer:fine)]:hidden"><Info className="h-3.5 w-3.5" /></button>
        </div>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content ref={contentRef} side="top" align="center" sideOffset={10} collisionPadding={16} onBlur={blur} className={`z-[100] max-h-[calc(100vh-100px)] w-[310px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-2xl outline-none ${cinema ? "home-cinema-preview" : ""}`}>
          {cinema ? <HomeHoverPreview {...props} /> : <MediaPreview {...props} />}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}