import React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Link } from "react-router-dom";
import { Play, Info, Layers, Tv, Download as DownloadIcon } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";

const PRIMARY =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90";
const SECONDARY =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10";

const Dot = () => <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />;

/**
 * Shared hover preview for Movies, TV Series and Collections.
 * Radix Portal keeps it above carousels and collision-aware at viewport edges.
 * Hover-only: touch devices go straight to the card link.
 */
export default function MediaHoverOverlay({ children, item, type, isUpdated, isPremium, onDownload }) {
  const primary =
    type === "franchise"
      ? { to: `/franchise?id=${item.id}`, label: "View Collection", Icon: Layers }
      : type === "series"
      ? { to: `/series?id=${item.id}`, label: "View Series", Icon: Tv }
      : { to: `/watch?id=${item.id}`, label: "Play", Icon: Play };

  const content = (
    <div className="flex w-[280px] flex-col gap-3 rounded-xl border border-white/10 bg-popover p-4 shadow-2xl shadow-black/80 sm:w-[320px]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">{item.title}</h3>
        {isUpdated && <StatusBadge status="UPDATED" className="shrink-0" />}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-muted-foreground sm:text-xs">
        {item.release_year && <span>{item.release_year}</span>}
        {item.duration && (
          <>
            <Dot />
            <span>{item.duration}</span>
          </>
        )}
        {type === "franchise" && <StatusBadge status="COLLECTION" />}
        {item.is_adult && <StatusBadge status="18+" />}
        {item.quality && item.quality !== "Unknown" && (
          <span className="rounded border border-primary/40 bg-primary/10 px-1 font-bold uppercase text-primary">{item.quality}</span>
        )}
      </div>

      {(item.description || item.category) && (
        <div className="flex flex-col gap-1.5">
          {item.category && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{item.category}</span>
          )}
          {item.description && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-3">
        <Link to={primary.to} className={PRIMARY}>
          <primary.Icon className={type === "video" ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} /> {primary.label}
        </Link>

        {type !== "franchise" && (
          <Link
            to={type === "series" ? `/series?id=${item.id}` : `/movie?id=${item.id}`}
            className={SECONDARY}
            aria-label="More info"
          >
            <Info className="h-4 w-4" />
          </Link>
        )}

        {type === "video" && onDownload && isPremium && item.video_url && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDownload(item);
            }}
            className={SECONDARY}
            aria-label="Download"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <HoverCardPrimitive.Root openDelay={350} closeDelay={150}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="right"
          align="start"
          sideOffset={12}
          collisionPadding={16}
          className="z-[100] animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          {content}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}