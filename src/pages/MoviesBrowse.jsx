import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "@/components/browse/VideoCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import PaginationControls from "@/components/browse/PaginationControls";
import { Loader2 } from "lucide-react";

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
    
    const items = [];
    const franchiseMap = new Map();
    const processedFranchises = new Set();
    
    // Group videos by franchise
    videos.forEach(video => {
      if (video.franchise_id) {
        if (!franchiseMap.has(video.franchise_id)) {
          franchiseMap.set(video.franchise_id, { count: 0, mostRecent: video.created_date || '' });
        }
        franchiseMap.get(video.franchise_id).count++;
        // update mostRecent if needed
        const currentMostRecent = franchiseMap.get(video.franchise_id).mostRecent;
        if (video.created_date && video.created_date > currentMostRecent) {
          franchiseMap.get(video.franchise_id).mostRecent = video.created_date;
        }
      } else {
        items.push({ type: 'video', data: video, sortKey: video.created_date || '' });
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
                if (item.type === 'franchise') {
                  return <FranchiseCard key={`franchise-${item.data.id}`} franchise={item.data} itemCount={item.itemCount} itemLabel="Movies" />;
                }
                return <VideoCard key={`video-${item.data.id}`} video={item.data} />;
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