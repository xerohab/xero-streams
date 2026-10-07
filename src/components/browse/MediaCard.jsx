import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import MediaHoverOverlay from "@/components/browse/MediaHoverOverlay";
import MediaPoster from "@/components/browse/MediaPoster";
import MediaCardFooter from "@/components/browse/MediaCardFooter";

/** The only poster shell: fixed-size artwork and an elevated charcoal footer. */
export default function MediaCard({ to, onClick, image, alt, FallbackIcon, HoverIcon, title, meta, badges, topRight, posterOverlay, popover, className }) {
  const Wrapper = to ? Link : "div";
  const card = (
    <Wrapper {...(to ? { to, onClick } : {})} className={cn("xero-media-card group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-within:border-primary/60", className)}>
      <MediaPoster image={image} alt={alt || title} FallbackIcon={FallbackIcon} HoverIcon={HoverIcon} badges={badges} topRight={topRight} posterOverlay={posterOverlay} />
      <MediaCardFooter title={title} meta={meta} />
    </Wrapper>
  );
  return popover ? <MediaHoverOverlay {...popover}>{card}</MediaHoverOverlay> : card;
}