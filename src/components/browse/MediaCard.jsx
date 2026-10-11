import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import MediaHoverOverlay from "@/components/browse/MediaHoverOverlay";
import MediaPoster from "@/components/browse/MediaPoster";
import MediaCardFooter from "@/components/browse/MediaCardFooter";

/** The only poster shell: fixed-size artwork and an elevated charcoal footer. */
export default function MediaCard({ to = undefined, onClick = undefined, image, alt = undefined, FallbackIcon, HoverIcon = undefined, title, meta, badges, topRight = undefined, posterOverlay = undefined, popover = undefined, className  = undefined}) {
  const wrapperProps = { className: cn("xero-media-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-within:border-primary/60", className) };
  const content = <><MediaPoster image={image} alt={alt || title} FallbackIcon={FallbackIcon} HoverIcon={HoverIcon} badges={badges} topRight={topRight} posterOverlay={posterOverlay} /><MediaCardFooter title={title} meta={meta} /></>;
  const card = to ? <Link to={to} onClick={onClick} {...wrapperProps}>{content}</Link> : <div {...wrapperProps}>{content}</div>;
  return popover ? <MediaHoverOverlay {...popover}>{card}</MediaHoverOverlay> : card;
}
