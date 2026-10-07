import React from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import MediaHoverOverlay from "@/components/browse/MediaHoverOverlay";

/**
 * The one visual shell for every poster card (Movie, Series, Collection, Book).
 * Wrappers (VideoCard, SeriesCard, FranchiseCard, BookCard) only supply data + routing.
 *
 * Width is controlled by MediaGrid; max-w keeps the card compact outside a grid too.
 */
export default function MediaCard({
  to,
  onClick,
  image,
  alt,
  FallbackIcon,
  HoverIcon,
  title,
  meta,
  badges,
  topRight,
  posterOverlay,
  popover,
  className,
}) {
  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to, onClick } : {};
  const metaItems = Array.isArray(meta) ? meta.filter(Boolean) : meta;

  const card = (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group relative flex w-full max-w-[180px] flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-card ring-1 ring-border transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/70 group-hover:ring-primary/70 group-focus-visible:ring-primary/70">
        {image ? (
          <img
            src={image}
            alt={alt || title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {FallbackIcon && <FallbackIcon className="h-9 w-9 opacity-30" />}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />

        {HoverIcon && (
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/60">
              <HoverIcon className={cn("h-4 w-4", HoverIcon === Play && "ml-0.5 fill-current")} />
            </span>
          </div>
        )}

        {posterOverlay}

        {badges && (
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex flex-col items-start gap-1">
            {badges}
          </div>
        )}
        {topRight && <div className="absolute right-1.5 top-1.5 z-10">{topRight}</div>}
      </div>

      <div className="px-0.5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        {metaItems && (Array.isArray(metaItems) ? metaItems.length > 0 : true) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-muted-foreground">
            {Array.isArray(metaItems)
              ? metaItems.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />}
                    <span className="inline-flex items-center gap-1">{item}</span>
                  </React.Fragment>
                ))
              : metaItems}
          </div>
        )}
      </div>
    </Wrapper>
  );

  return popover ? <MediaHoverOverlay {...popover}>{card}</MediaHoverOverlay> : card;
}