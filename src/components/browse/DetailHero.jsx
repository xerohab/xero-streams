import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Flow-based hero: backdrop, visible poster, synopsis and controls never overlap. */
export default function DetailHero({ image, backdrop, title, FallbackIcon, eyebrow, meta, description, backTo, children }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-border bg-background">
      {(backdrop || image) && <img src={backdrop || image} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-top opacity-45" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/20 to-background/50" />
      <div className="xero-container pb-10 pt-24 md:pb-12 md:pt-28">
        {backTo && <Link to={backTo} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to browse</Link>}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end md:gap-9">
          <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:w-36 md:w-44">
            {image ? <img src={image} alt={title} className="aspect-[2/3] w-full object-cover" /> : <div className="flex aspect-[2/3] items-center justify-center">{FallbackIcon && <FallbackIcon className="h-12 w-12 text-muted-foreground/40" />}</div>}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            {eyebrow && <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">{title}</h1>
            {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground md:text-sm">{meta}</div>}
            {description && <p className="max-w-3xl text-sm leading-relaxed text-foreground/75 md:text-base">{description}</p>}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">{children}</div>
          </div>
        </div>
      </div>
    </header>
  );
}