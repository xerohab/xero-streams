import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getCatalogMedia } from "@/lib/activityUtils";
import { buildGenreIndex, listGenres } from "@/lib/genreUtils";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

const MIN_ROW_ITEMS = 6;
const MAX_GENRE_ROWS = 3;

/** Movies / TV catalogue: reuses the shared cached catalogue queries and filters them in memory. */
export default function useBrowseCatalog(type) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setSize] = useState(() => { const n = Number(localStorage.getItem("xero_page_size")); return [20, 30, 40, 50].includes(n) ? n : 20; });
  const genre = params.get("genre") || "all";
  const sort = params.get("sort") === "title" ? "title" : "latest";
  const { data: videos = [], isLoading: lv } = useQuery({ queryKey: ["cinema_catalog", "videos"], queryFn: () => loadMediaRecords(base44.entities.Video) });
  const { data: series = [], isLoading: ls } = useQuery({ queryKey: ["cinema_catalog", "series"], queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000) });
  const { data: franchises = [], isLoading: lf } = useQuery({ queryKey: ["cinema_catalog", "franchises"], queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000) });
  const { data: categories = [] } = useQuery({ queryKey: ["video_categories"], queryFn: () => base44.entities.VideoCategory.list() });

  const { groups, genreIndex, genres } = useMemo(() => {
    const safeSeries = series.filter((s) => !s.is_adult);
    const safeVideos = videos.filter((v) => !v.is_adult);
    const groups = getCatalogMedia(franchises, safeSeries, safeVideos, type);
    const genreIndex = buildGenreIndex(groups, { franchises, series: safeSeries, videos: safeVideos, categories, type });
    return { groups, genreIndex, genres: listGenres(groups, genreIndex) };
  }, [videos, series, franchises, categories, type]);

  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups.filter((g) => !needle || g.data.title.toLowerCase().includes(needle)).sort((a, b) => {
      const franchiseFirst = Number(b.type === "franchise") - Number(a.type === "franchise");
      return franchiseFirst || (sort === "title" ? a.data.title.localeCompare(b.data.title) : b.latestActivityAt - a.latestActivityAt);
    });
  }, [groups, query, sort]);

  const inGenre = (g, name) => genreIndex.get(g.data.id)?.has(name);
  const items = genre === "all" ? sorted : sorted.filter((g) => inGenre(g, genre));
  const genreRows = genre === "all" && !query.trim() && currentPage === 1
    ? [...genres].filter((g) => g.count >= MIN_ROW_ITEMS).sort((a, b) => b.count - a.count).slice(0, MAX_GENRE_ROWS)
        .map((g) => ({ genre: g.name, total: g.count, items: sorted.filter((x) => inGenre(x, g.name)).slice(0, 14) }))
    : [];

  const updateParams = (patch) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    Object.entries(patch).forEach(([key, value]) => { if (!value || value === "all" || (key === "sort" && value === "latest")) next.delete(key); else next.set(key, value); });
    return next;
  }, { replace: true });

  useEffect(() => setCurrentPage(1), [query, genre, sort, itemsPerPage]);
  const onSize = (n) => { setSize(n); localStorage.setItem("xero_page_size", String(n)); };
  const clearFilters = () => { setQuery(""); updateParams({ genre: null }); };
  return {
    query, setQuery, genre, setGenre: (value) => updateParams({ genre: value }), sort, setSort: (value) => updateParams({ sort: value }), genres, genreRows, clearFilters,
    currentPage, setCurrentPage, itemsPerPage, onSize, totalItems: items.length, totalPages: Math.ceil(items.length / itemsPerPage) || 1,
    items: items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), isLoading: lv || ls || lf,
  };
}