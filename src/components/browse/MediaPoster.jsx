import React from "react";
import { Play } from "lucide-react";

export default function MediaPoster({ image, alt = undefined, FallbackIcon, HoverIcon, badges, topRight = undefined, posterOverlay  = undefined}) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden bg-secondary">
      {image ? <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">{FallbackIcon && <FallbackIcon className="h-10 w-10 opacity-30" />}</div>}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
      {HoverIcon && <div className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:flex"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><HoverIcon className={HoverIcon === Play ? "h-4 w-4 fill-current" : "h-4 w-4"} /></span></div>}
      {badges && <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">{badges}</div>}
      {topRight && <div className="absolute right-2 top-2">{topRight}</div>}
      {posterOverlay}
    </div>
  );
}
