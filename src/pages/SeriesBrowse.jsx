import React, { useState, useMemo } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import PaginationControls from "@/components/browse/PaginationControls";
import { Loader2 } from "lucide-react";
import { getTopLevelMedia, isRecentlyUpdated } from "@/lib/activityUtils";

export default function SeriesBrowse() {
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("xero_page_size");
    return saved ? parseInt(saved, 10) : 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val);
    localStorage.setItem("xero_page_size", val.toString());
    setCurrentPage(1);
  };

  const { data: seriesList = [], isLoading: isLoadingSeries } = useQuery({
    queryKey: ["series_browse"],
    queryFn: () => base44.entities.Series.filter({ is_adult: false }, "-updated_date", 1000)
  });
  
  const { data: franchises = [], isLoading: isLoadingFranchises } = useQuery({
    queryKey: ["series_browse_franchises"],
    queryFn: () => base44.entities.Franchise.list("-updated_date", 1000)
  });

  const isLoading = isLoadingSeries || isLoadingFranchises;

  // Compute top-level items: Standalone Series + Franchises containing series
  const topLevelItems = useMemo(() => {
    if (!seriesList.length) return [];
    
    const allGroups = getTopLevelMedia(franchises, seriesList, []);
    
    // We only want franchises that have items and standalone series.
    const filtered = allGroups.filter(g => g.type === 'series' || (g.type === 'franchise' && g.items > 0));

    // Sort by latestActivityAt descending
    filtered.sort((a, b) => b.latestActivityAt - a.latestActivityAt);
    return filtered;
  }, [seriesList, franchises]);

  // Pagination logic
  const totalItems = topLevelItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = topLevelItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="xero-container min-h-[70vh] pt-28">
        <SectionHeader level={1} title="TV Series" subtitle="Discover your next binge-worthy show." className="mb-8" />

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : topLevelItems.length > 0 ? (
          <>
            <MediaGrid>
              {paginatedItems.map(item => {
                const isUpdated = isRecentlyUpdated(item.latestActivityAt);
                if (item.type === 'franchise') {
                  return <FranchiseCard key={`franchise-${item.data.id}`} franchise={item.data} itemCount={item.items} itemLabel="Series" isUpdated={isUpdated} />;
                }
                return <SeriesCard key={`series-${item.data.id}`} series={item.data} isUpdated={isUpdated} />;
              })}
            </MediaGrid>
            
            <PaginationControls 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              itemsPerPage={itemsPerPage} 
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={totalItems}
            />
          </>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-foreground">No TV Series Found</h3>
            <p className="text-muted-foreground">Check back later for new shows.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}