import React, { useState, useMemo } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "@/components/browse/VideoCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import PaginationControls from "@/components/browse/PaginationControls";
import { Loader2 } from "lucide-react";
import { getTopLevelMedia, isRecentlyUpdated } from "@/lib/activityUtils";

export default function MoviesBrowse() {
  // Use localStorage for preferences
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("xero_page_size");
    return saved ? parseInt(saved, 10) : 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val);
    localStorage.setItem("xero_page_size", val.toString());
    setCurrentPage(1); // Reset to page 1
  };

  const { data: videos = [], isLoading: isLoadingVideos } = useQuery({
    queryKey: ["movies_browse_videos"],
    queryFn: () => base44.entities.Video.filter({ content_type: "movie", is_adult: false }, "-created_date")
  });
  
  const { data: franchises = [], isLoading: isLoadingFranchises } = useQuery({
    queryKey: ["movies_browse_franchises"],
    queryFn: () => base44.entities.Franchise.list() // Load all franchises
  });

  const isLoading = isLoadingVideos || isLoadingFranchises;

  // Compute top-level items: Standalone Movies + Franchises containing movies
  const topLevelItems = useMemo(() => {
    if (!videos.length) return [];
    
    const allGroups = getTopLevelMedia(franchises, [], videos);
    
    // We only want franchises that have items (since we didn't pass series) 
    // and standalone videos.
    const filtered = allGroups.filter(g => g.type === 'video' || (g.type === 'franchise' && g.items > 0));

    // Sort by latestActivityAt descending
    filtered.sort((a, b) => b.latestActivityAt - a.latestActivityAt);
    return filtered;
  }, [videos, franchises]);

  // Pagination logic
  const totalItems = topLevelItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = topLevelItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-28 px-4 md:px-12 max-w-[1800px] mx-auto min-h-[70vh]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Movies</h1>
          <p className="text-muted-foreground mt-2 text-lg">Browse our latest cinematic releases.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : topLevelItems.length > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-center">
              {paginatedItems.map(item => {
                const isUpdated = isRecentlyUpdated(item.latestActivityAt);
                if (item.type === 'franchise') {
                  return <FranchiseCard key={`franchise-${item.data.id}`} franchise={item.data} itemCount={item.items} itemLabel="Movies" isUpdated={isUpdated} />;
                }
                return <VideoCard key={`video-${item.data.id}`} video={item.data} isUpdated={isUpdated} />;
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
            <h3 className="text-xl font-bold text-foreground">No Movies Found</h3>
            <p className="text-muted-foreground">Check back later for new additions.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}