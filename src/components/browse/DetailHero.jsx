import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Cinematic detail hero: full-width backdrop with strong left/bottom gradients,
 * content overlaid on the left. Used by MovieDetail, SeriesDetail, CollectionHero.
 */
export default function DetailHero({ image, backdrop, title, FallbackIcon, eyebrow, meta, description, backTo, children }) {
  return (
    <header className="xero-detail-hero" aria-label={title}>
      {(backdrop || image) && <img src={backdrop || image} alt="" aria-hidden="true" className="xero-detail-hero-artwork" />}
      <div className="xero-detail-hero-shade" />
      <div className="xero-detail-hero-left" />
      <div className="xero-detail-hero-bottom" />
      <div className="xero-container xero-detail-hero-inner">
        {backTo && (
          <Link to={backTo} className="xero-detail-hero-back">
            <ArrowLeft className="h-3.5 w-3.5" />Back to browse
          </Link>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end md:gap-7">
          <div className="w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-2xl sm:w-32 md:w-40">
            {image ? <img src={image} alt={title} className="aspect-[2/3] w-full object-cover" /> : <div className="flex aspect-[2/3] items-center justify-center">{FallbackIcon && <FallbackIcon className="h-10 w-10 text-muted-foreground/40" />}</div>}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {eyebrow && <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">{title}</h1>
            {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-muted-foreground md:text-sm">{meta}</div>}
            {description && <p className="max-w-3xl text-sm leading-relaxed text-foreground/70 md:text-[15px]">{description}</p>}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">{children}</div>
          </div>
        </div>
      </div>
    </header>
  );
}