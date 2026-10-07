import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/browse/StatusBadge";

/** Cinematic header for a Collection (Franchise): backdrop, compact poster, status, title count. */
export default function CollectionHero({ franchise, titleCount, isUpdated, isFavourited, onToggleFavourite }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {franchise.cover_image && (
        <img
          src={franchise.cover_image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-25 blur-xl"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/75 to-background/30" />

      <div className="xero-container flex items-end gap-5 pb-8 pt-28 md:gap-8 md:pb-10 md:pt-32">
        <div className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg bg-card shadow-2xl shadow-black/80 ring-1 ring-border sm:w-36 md:w-44">
          {franchise.cover_image ? (
            <img src={franchise.cover_image} alt={franchise.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Layers className="h-10 w-10 opacity-30" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Browse
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="COLLECTION" />
            {isUpdated && <StatusBadge status="UPDATED" />}
            <span className="text-xs font-semibold text-muted-foreground">
              {titleCount} {titleCount === 1 ? "Title" : "Titles"}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">{franchise.title}</h1>
          {franchise.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/80 line-clamp-3 md:line-clamp-none md:text-base">
              {franchise.description}
            </p>
          )}
          <Button
            variant={isFavourited ? "default" : "outline"}
            className={`gap-2 ${isFavourited ? "" : "border-white/20 bg-white/5 text-foreground hover:bg-white/10"}`}
            onClick={onToggleFavourite}
          >
            <Heart className={`h-4 w-4 ${isFavourited ? "fill-current" : ""}`} />
            {isFavourited ? "Favourited" : "Favourite Collection"}
          </Button>
        </div>
      </div>
    </section>
  );
}