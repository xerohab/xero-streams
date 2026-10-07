import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getCatalogMedia } from "@/lib/activityUtils";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

export default function useBrowseCatalog(type) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setSize] = useState(() => { const n = Number(localStorage.getItem("xero_page_size")); return [20, 30, 40, 50].includes(n) ? n : 20; });
  const { data: videos = [], isLoading: lv } = useQuery({ queryKey: ["cinema_catalog", "videos"], queryFn: () => loadMediaRecords(base44.entities.Video) });
  const { data: series = [], isLoading: ls } = useQuery({ queryKey: ["cinema_catalog", "series"], queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000) });
  const { data: franchises = [], isLoading: lf } = useQuery({ queryKey: ["cinema_catalog", "franchises"], queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000) });
  const { data: categories = [] } = useQuery({ queryKey: ["video_categories"], queryFn: () => base44.entities.VideoCategory.list() });
  const groups = getCatalogMedia(franchises, series.filter((s) => !s.is_adult), videos.filter((v) => !v.is_adult), type);
  const genreOf = (item) => item.category || categories.find((c) => c.id === item.category_id)?.title || "";
  const genres = [...new Set(groups.map((g) => genreOf(g.data)).filter(Boolean))].sort();
  const items = groups.filter((g) => (!query.trim() || g.data.title.toLowerCase().includes(query.trim().toLowerCase())) && (genre === "all" || genreOf(g.data) === genre)).sort((a, b) => {
    const franchiseFirst = Number(b.type === "franchise") - Number(a.type === "franchise");
    return franchiseFirst || (sort === "title" ? a.data.title.localeCompare(b.data.title) : b.latestActivityAt - a.latestActivityAt);
  });
  useEffect(() => setCurrentPage(1), [query, genre, sort, itemsPerPage]);
  const onSize = (n) => { setSize(n); localStorage.setItem("xero_page_size", String(n)); };
  return { query, setQuery, genre, setGenre, sort, setSort, genres, currentPage, setCurrentPage, itemsPerPage, onSize, totalItems: items.length, totalPages: Math.ceil(items.length / itemsPerPage) || 1, items: items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), isLoading: lv || ls || lf };
}