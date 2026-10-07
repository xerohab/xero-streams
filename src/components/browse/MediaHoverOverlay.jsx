import React, { useState, useEffect, useRef } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import MediaPreview from "@/components/browse/MediaPreview";

/** Floating, collision-aware Radix preview; never resizes the base card. */
export default function MediaHoverOverlay({ children, ...props }) {
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
  const blur = (event) => {
    if (!contentRef.current?.contains(event.relatedTarget) && !triggerRef.current?.contains(event.relatedTarget)) setOpen(false);
  };
  return (
    <HoverCardPrimitive.Root open={desktop && open} onOpenChange={setOpen} openDelay={300} closeDelay={180}>
      <HoverCardPrimitive.Trigger ref={triggerRef} asChild onFocus={() => setOpen(true)} onBlur={blur} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content ref={contentRef} side="right" align="start" sideOffset={10} collisionPadding={16} onFocus={() => setOpen(true)} onBlur={blur} onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } }} className="z-[100] w-[310px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-popover p-5 shadow-2xl outline-none">
          <MediaPreview {...props} />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}