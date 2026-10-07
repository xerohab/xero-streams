import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/browse/Navbar";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import PaginationControls from "@/components/browse/PaginationControls";
import { getItemActivityAt, isRecentlyUpdated } from "@/lib/activityUtils";

export default function Search() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(urlParams.get("q") || "");
  const [filterType, setFilterType] = useState("all"); 
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [filterCast, setFilterCast] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const { data: videos = [] } = useQuery({ queryKey: ["videos"], queryFn: () => base44.entities.Video.list("-created_date") });
  const { data: seriesList = [] } = useQuery({ queryKey: ["series"], queryFn: () => base44.entities.Series.list() });
  const { data: franchises = [] } = useQuery({ queryKey: ["franchises"], queryFn: () => base44.entities.Franchise.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["video_categories"], queryFn: () => base44.entities.VideoCategory.list() });

  const results = useMemo(() => {
    setCurrentPage(1);
    
    const q = query.toLowerCase().trim();
    if (!q && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast) {
      return [];
    }

    let filteredVideos = videos;
    let filteredSeries = seriesList;
    let filteredFranchises = franchises;

    if (q) {
      filteredVideos = filteredVideos.filter(v => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
      filteredSeries = filteredSeries.filter(s => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      filteredFranchises = filteredFranchises.filter(f => f.title?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
    }

    if (filterCategory !== "all") {
      filteredVideos = filteredVideos.filter(v => v.category_id === filterCategory);
      filteredSeries = filteredSeries.filter(s => s.category === filterCategory);
      filteredFranchises = filteredFranchises.filter(f => f.category === filterCategory);
    }

    if (filterYear) {
      filteredVideos = filteredVideos.filter(v => (v.release_year && v.release_year.toString() === filterYear) || (v.release_date && v.release_date.startsWith(filterYear)));
      filteredSeries = filteredSeries.filter(s => s.release_year && s.release_year.toString() === filterYear);
      filteredFranchises = []; 
    }

    if (filterCast) {
      const c = filterCast.toLowerCase().trim();
      filteredVideos = filteredVideos.filter(v => v.cast?.toLowerCase().includes(c));
      filteredSeries = filteredSeries.filter(s => s.cast?.toLowerCase().includes(c));
      filteredFranchises = []; 
    }

    if (filterType === "movies") {
      filteredSeries = [];
      filteredFranchises = []; 
      filteredVideos = filteredVideos.filter(v => v.content_type === 'movie');
    }
    if (filterType === "series") {
      filteredVideos = [];
    }

    const items = [
      ...filteredFranchises.map(f => ({ type: 'franchise', data: f })),
      ...filteredSeries.map(s => ({ type: 'series', data: s })),
      ...filteredVideos.map(v => ({ type: 'video', data: v }))
    ];

    return items;
  }, [query, videos, seriesList, franchises, filterType, filterCategory, filterYear, filterCast]);

  const hasResults = results.length > 0;
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
  const paginatedItems = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getFranchiseCount = (fId) => {
    return seriesList.filter(s => s.franchise_id === fId).length + videos.filter(v => v.franchise_id === fId).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-4 md:px-12 max-w-[1800px] mx-auto pb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex flex-col gap-4 max-w-4xl mb-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-[2]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, TV shows, collections..."
                className="pl-10 h-12 text-base bg-card border-border w-full"
              />
            </div>
            <div className="flex flex-1 gap-2">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-12 flex-1 px-4 rounded-md border border-input bg-card text-foreground">
                <option value="all">All Types</option>
                <option value="movies">Movies</option>
                <option value="series">TV Series</option>
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-12 flex-1 px-4 rounded-md border border-input bg-card text-foreground">
                <option value="all">All Genres</option>
                <option value="action">Action</option>
                <option value="comedy">Comedy</option>
                <option value="drama">Drama</option>
                <option value="documentary">Documentary</option>
                <option value="horror">Horror</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="thriller">Thriller</option>
                <option value="education">Education</option>
                <option value="music">Music</option>
                <option value="crime">Crime</option>
                <option value="mystery">Mystery</option>
                <option value="fantasy">Fantasy</option>
                <option value="romance">Romance</option>
                <option value="animation">Animation</option>
                <option value="adventure">Adventure</option>
                <option value="other">Other</option>
                {categories.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
              </select>
              <button onClick={() => setShowAdvanced(!showAdvanced)} className={`h-12 w-12 flex items-center justify-center rounded-md border transition-colors ${showAdvanced ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="flex flex-col md:flex-row gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
              <Input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="Release Year" className="flex-1 h-12 text-base bg-card border-border" type="number" />
              <Input value={filterCast} onChange={(e) => setFilterCast(e.target.value)} placeholder="Search by Cast Member" className="flex-[2] h-12 text-base bg-card border-border" />
            </div>
          )}
        </div>

        {!hasResults && query.trim() === "" && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast && (
          <p className="text-muted-foreground">Start typing or use filters to search...</p>
        )}

        {query.trim() !== "" && !hasResults && (
          <p className="text-muted-foreground">No results found for "<strong>{query}</strong>"</p>
        )}

        {hasResults && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-center">
              {paginatedItems.map((item, idx) => {
                const activity = getItemActivityAt(item.data, franchises, seriesList, videos);
                const isUpdated = isRecentlyUpdated(activity);
                if (item.type === 'franchise') return <FranchiseCard key={`f-${item.data.id}`} franchise={item.data} itemCount={getFranchiseCount(item.data.id)} isUpdated={isUpdated} />;
                if (item.type === 'series') return <SeriesCard key={`s-${item.data.id}`} series={item.data} isUpdated={isUpdated} />;
                return <VideoCard key={`v-${item.data.id}`} video={item.data} isUpdated={isUpdated} />;
              })}
            </div>
            
            <PaginationControls 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              itemsPerPage={itemsPerPage} 
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={results.length}
            />
          </>
        )}
      </div>
    </div>
  );
}