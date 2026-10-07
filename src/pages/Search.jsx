import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import BookCard from "@/components/browse/BookCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import SearchFilters from "@/components/browse/SearchFilters";
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

  const { data: videos = [] } = useQuery({ queryKey: ["videos"], queryFn: () => base44.entities.Video.list("-updated_date", 2000) });
  const { data: seriesList = [] } = useQuery({ queryKey: ["series"], queryFn: () => base44.entities.Series.list("-updated_date", 1000) });
  const { data: franchises = [] } = useQuery({ queryKey: ["franchises"], queryFn: () => base44.entities.Franchise.list("-updated_date", 1000) });
  const { data: categories = [] } = useQuery({ queryKey: ["video_categories"], queryFn: () => base44.entities.VideoCategory.list() });
  const { data: books = [] } = useQuery({ queryKey: ["search_books"], queryFn: () => base44.entities.Book.filter({ is_active: true }, "sort_order", 200) });
  const { data: authors = [] } = useQuery({ queryKey: ["book_authors"], queryFn: () => base44.entities.BookAuthor.list() });

  const results = useMemo(() => {
    setCurrentPage(1);
    
    const q = query.toLowerCase().trim();
    if (!q && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast) {
      return [];
    }

    let filteredVideos = videos;
    let filteredSeries = seriesList;
    let filteredFranchises = franchises;
    let filteredBooks = books;

    if (q) {
      filteredVideos = filteredVideos.filter(v => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
      filteredSeries = filteredSeries.filter(s => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      filteredFranchises = filteredFranchises.filter(f => f.title?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
      filteredBooks = filteredBooks.filter(b => {
        const authorName = authors.find(a => a.id === b.author_id)?.name || "";
        return b.title?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || authorName.toLowerCase().includes(q);
      });
    }

    // Books have no genre / year / cast, so those filters exclude them (like collections)
    if (filterCategory !== "all") {
      filteredVideos = filteredVideos.filter(v => v.category_id === filterCategory);
      filteredSeries = filteredSeries.filter(s => s.category === filterCategory);
      filteredFranchises = filteredFranchises.filter(f => f.category === filterCategory);
      filteredBooks = [];
    }

    if (filterYear) {
      filteredVideos = filteredVideos.filter(v => (v.release_year && v.release_year.toString() === filterYear) || (v.release_date && v.release_date.startsWith(filterYear)));
      filteredSeries = filteredSeries.filter(s => s.release_year && s.release_year.toString() === filterYear);
      filteredFranchises = []; 
      filteredBooks = [];
    }

    if (filterCast) {
      const c = filterCast.toLowerCase().trim();
      filteredVideos = filteredVideos.filter(v => v.cast?.toLowerCase().includes(c));
      filteredSeries = filteredSeries.filter(s => s.cast?.toLowerCase().includes(c));
      filteredFranchises = []; 
      filteredBooks = [];
    }

    if (filterType === "movies") {
      filteredSeries = [];
      filteredFranchises = []; 
      filteredBooks = [];
      filteredVideos = filteredVideos.filter(v => v.content_type === 'movie');
    }
    if (filterType === "series") {
      filteredVideos = [];
      filteredBooks = [];
    }
    if (filterType === "books") {
      filteredVideos = [];
      filteredSeries = [];
      filteredFranchises = [];
    }

    const items = [
      ...filteredFranchises.map(f => ({ type: 'franchise', data: f })),
      ...filteredSeries.map(s => ({ type: 'series', data: s })),
      ...filteredVideos.map(v => ({ type: 'video', data: v })),
      ...filteredBooks.map(b => ({ type: 'book', data: b }))
    ];

    return items;
  }, [query, videos, seriesList, franchises, books, authors, filterType, filterCategory, filterYear, filterCast]);

  const hasResults = results.length > 0;
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
  const paginatedItems = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getFranchiseCount = (fId) => {
    return seriesList.filter(s => s.franchise_id === fId).length + videos.filter(v => v.franchise_id === fId).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="xero-container min-h-[70vh] pb-16 pt-24">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <SectionHeader level={1} title="Search" className="mb-6" />

        <SearchFilters
          query={query} onQuery={setQuery}
          filterType={filterType} onType={setFilterType}
          filterCategory={filterCategory} onCategory={setFilterCategory}
          filterYear={filterYear} onYear={setFilterYear}
          filterCast={filterCast} onCast={setFilterCast}
          showAdvanced={showAdvanced} onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          categories={categories}
        />

        {!hasResults && query.trim() === "" && filterType === "all" && filterCategory === "all" && !filterYear && !filterCast && (
          <p className="text-muted-foreground">Start typing or use filters to search...</p>
        )}

        {query.trim() !== "" && !hasResults && (
          <p className="text-muted-foreground">No results found for "<strong>{query}</strong>"</p>
        )}

        {hasResults && (
          <>
            <MediaGrid>
              {paginatedItems.map((item) => {
                if (item.type === 'book') {
                  return <BookCard key={`b-${item.data.id}`} book={item.data} author={authors.find(a => a.id === item.data.author_id)} to="/books" />;
                }
                const activity = getItemActivityAt(item.data, franchises, seriesList, videos);
                const isUpdated = isRecentlyUpdated(activity);
                if (item.type === 'franchise') return <FranchiseCard key={`f-${item.data.id}`} franchise={item.data} itemCount={getFranchiseCount(item.data.id)} isUpdated={isUpdated} />;
                if (item.type === 'series') return <SeriesCard key={`s-${item.data.id}`} series={item.data} isUpdated={isUpdated} />;
                return <VideoCard key={`v-${item.data.id}`} video={item.data} isUpdated={isUpdated} />;
              })}
            </MediaGrid>
            
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
      <Footer />
    </div>
  );
}