import React, { useState, useMemo } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import PaginationControls from "@/components/browse/PaginationControls";
import { Loader2 } from "lucide-react";

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
    queryFn: () => base44.entities.Series.filter({ is_adult: false }, "-created_date")
  });
  
  const { data: franchises = [], isLoading: isLoadingFranchises } = useQuery({
    queryKey: ["series_browse_franchises"],
    queryFn: () => base44.entities.Franchise.list()
  });

  const isLoading = isLoadingSeries || isLoadingFranchises;

  // Compute top-level items: Standalone Series + Franchises containing series
  const topLevelItems = useMemo(() => {
    if (!seriesList.length) return [];
    
    const items = [];
    const franchiseMap = new Map();
    const processedFranchises = new Set();
    
    // Group series by franchise
    seriesList.forEach(series => {
      if (series.franchise_id) {
        if (!franchiseMap.has(series.franchise_id)) {
          franchiseMap.set(series.franchise_id, { count: 0, mostRecent: series.created_date || '' });
        }
        franchiseMap.get(series.franchise_id).count++;
        // update mostRecent
        if (series.created_date && series.created_date > franchiseMap.get(series.franchise_id).mostRecent) {
          franchiseMap.get(series.franchise_id).mostRecent = series.created_date;
        }
      } else {
        items.push({ type: 'series', data: series, sortKey: series.created_date || '' });
      }
    });

    // Add valid franchises to the top level
    franchiseMap.forEach((info, franchiseId) => {
      const franchise = franchises.find(f => f.id === franchiseId);
      if (franchise && !processedFranchises.has(franchiseId)) {
        processedFranchises.add(franchiseId);
        items.push({ type: 'franchise', data: franchise, itemCount: info.count, sortKey: info.mostRecent });
      }
    });

    // Sort combined list by most recent (descending)
    items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return items;
  }, [seriesList, franchises]);

  // Pagination logic
  const totalItems = topLevelItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = topLevelItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-28 px-4 md:px-12 max-w-[1800px] mx-auto min-h-[70vh]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">TV Series</h1>
          <p className="text-muted-foreground mt-2 text-lg">Discover your next binge-worthy show.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : topLevelItems.length > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-center">
              {paginatedItems.map(item => {
                if (item.type === 'franchise') {
                  return <FranchiseCard key={`franchise-${item.data.id}`} franchise={item.data} itemCount={item.itemCount} itemLabel="Series" />;
                }
                return <SeriesCard key={`series-${item.data.id}`} series={item.data} />;
              })}
            </div>
            
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