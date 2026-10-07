import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Cinematic hero shared by MovieDetail and SeriesDetail:
 * backdrop + gradients, compact poster, eyebrow, title, meta, synopsis, and an actions slot.
 */
export default function DetailHero({ image, title, FallbackIcon, eyebrow, meta, description, backTo, children }) {
  return (
    <div className="relative h-[52vh] max-h-[680px] min-h-[420px] w-full bg-black md:h-[64vh]">
      {image ? (
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover opacity-40 md:opacity-50"
          style={{ maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)" }}
        />
      ) : (
        <div className="h-full w-full bg-secondary/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

      <div className="xero-container absolute inset-x-0 bottom-0 flex flex-col items-end gap-8 pb-8 pt-32 md:flex-row">
        <div className="z-10 hidden w-40 shrink-0 translate-y-14 overflow-hidden rounded-lg shadow-2xl shadow-black/80 ring-1 ring-border md:block lg:w-48">
          {image ? (
            <img src={image} alt={title} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-card">
              {FallbackIcon && <FallbackIcon className="h-12 w-12 text-muted-foreground/30" />}
            </div>
          )}
        </div>

        <div className="z-10 w-full flex-1 space-y-3">
          {backTo && (
            <Link to={backTo} className="mb-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          )}
          {eyebrow}
          <h1 className="text-3xl font-black tracking-tight text-foreground drop-shadow-lg md:text-5xl">{title}</h1>
          {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-medium text-muted-foreground">{meta}</div>}
          {description && (
            <p className="max-w-3xl text-sm leading-relaxed text-foreground/80 line-clamp-3 md:line-clamp-none md:text-base">{description}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}