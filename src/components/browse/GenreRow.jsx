import React from "react";
import { ChevronRight } from "lucide-react";
import SectionHeader from "@/components/browse/SectionHeader";
import BrowseItemCard from "@/components/browse/BrowseItemCard";

/** Compact horizontal genre row, e.g. "HORROR MOVIES — VIEW ALL", using the shared poster cards. */
export default function GenreRow({ genre, noun, items, onViewAll }) {
  return (
    <section aria-label={`${genre} ${noun}`} className="mb-6">
      <SectionHeader
        title={`${genre} ${noun}`}
        className="mb-3"
        action={<button type="button" onClick={() => onViewAll(genre)} className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary">View all<ChevronRight className="h-3.5 w-3.5" /></button>}
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
        {items.map((item) => <div key={item.data.id} className="w-[140px] shrink-0 sm:w-[150px]"><BrowseItemCard item={item} /></div>)}
      </div>
    </section>
  );
}