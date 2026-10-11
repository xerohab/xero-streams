import React, { useEffect } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import SectionHeader from "@/components/browse/SectionHeader";
import BrowseControls from "@/components/browse/BrowseControls";
import BrowseSkeleton from "@/components/browse/BrowseSkeleton";
import BrowseItemCard from "@/components/browse/BrowseItemCard";
import GenreRow from "@/components/browse/GenreRow";
import MediaGrid from "@/components/browse/MediaGrid";
import PaginationControls from "@/components/browse/PaginationControls";
import useBrowseCatalog from "@/components/browse/useBrowseCatalog";

export default function BrowseCatalog({ type, title, subtitle  = undefined}) {
  const catalog = useBrowseCatalog(type);
  const noun = type === "video" ? "Movies" : "Series";
  const genreLabel = catalog.genre !== "all" ? `${catalog.genre} ${title}` : title;
  useEffect(() => {
    document.title = `${genreLabel} | Xero Streams`;
    return () => { document.title = "Xero Streams"; };
  }, [genreLabel]);
  const viewAll = (genre) => { catalog.setGenre(genre); window.scrollTo({ top: 0 }); };
  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Navbar />
      <main className="xero-container flex-1 pb-10 pt-24">
        <header className="xero-page-header"><p className="xero-kicker">Xero Cinema / The Library</p><SectionHeader level={1} title={catalog.genre !== "all" ? genreLabel : title} subtitle={subtitle} className="mb-0" /></header>
        <BrowseControls catalog={catalog} />
        {catalog.isLoading ? <BrowseSkeleton /> : <>
          {catalog.genreRows.map((row) => <GenreRow key={row.genre} genre={row.genre} noun={noun} items={row.items} onViewAll={viewAll} />)}
          {catalog.genreRows.length > 0 && <SectionHeader title={`All ${title}`} className="mb-3 mt-8" />}
          {catalog.items.length ? <>
            <MediaGrid>{catalog.items.map((item) => <BrowseItemCard key={item.data.id} item={item} />)}</MediaGrid>
            <PaginationControls currentPage={catalog.currentPage} totalPages={catalog.totalPages} onPageChange={catalog.setCurrentPage} itemsPerPage={catalog.itemsPerPage} onItemsPerPageChange={catalog.onSize} totalItems={catalog.totalItems} />
          </> : <div className="py-16 text-center">
            <p className="text-muted-foreground">{catalog.genre !== "all" ? `No ${catalog.genre} ${noun.toLowerCase()} match your filters.` : "No matching titles. Try another filter."}</p>
            <button type="button" onClick={catalog.clearFilters} className="mt-4 rounded-lg border border-primary/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10">Clear filters</button>
          </div>}
        </>}
      </main>
      <Footer />
    </div>
  );
}
