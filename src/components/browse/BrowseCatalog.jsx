import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import SectionHeader from "@/components/browse/SectionHeader";
import BrowseControls from "@/components/browse/BrowseControls";
import MediaGrid from "@/components/browse/MediaGrid";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import PaginationControls from "@/components/browse/PaginationControls";
import useBrowseCatalog from "@/components/browse/useBrowseCatalog";
import { isRecentlyUpdated } from "@/lib/activityUtils";

export default function BrowseCatalog({ type, title, subtitle }) {
  const catalog = useBrowseCatalog(type);
  useEffect(() => {
    document.title = `${title} | Xero Streams`;
    return () => { document.title = "Xero Streams"; };
  }, [title]);
  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Navbar />
      <main className="xero-container flex-1 pb-10 pt-24">
        <header className="xero-page-header"><p className="xero-kicker">Xero Cinema / The Library</p><SectionHeader level={1} title={title} subtitle={subtitle} className="mb-0" /></header>
        <BrowseControls catalog={catalog} />
        {catalog.isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : catalog.items.length ? <>
          <MediaGrid>{catalog.items.map((item) => {
            const isUpdated = isRecentlyUpdated(item.latestActivityAt);
            if (item.type === "franchise") return <FranchiseCard key={item.data.id} franchise={item.data} itemCount={item.items} isUpdated={isUpdated} />;
            if (item.type === "series") return <SeriesCard key={item.data.id} series={item.data} isUpdated={isUpdated} />;
            return <VideoCard key={item.data.id} video={item.data} isUpdated={isUpdated} />;
          })}</MediaGrid>
          <PaginationControls currentPage={catalog.currentPage} totalPages={catalog.totalPages} onPageChange={catalog.setCurrentPage} itemsPerPage={catalog.itemsPerPage} onItemsPerPageChange={catalog.onSize} totalItems={catalog.totalItems} />
        </> : <p className="py-20 text-center text-muted-foreground">No matching titles. Try another filter.</p>}
      </main>
      <Footer />
    </div>
  );
}