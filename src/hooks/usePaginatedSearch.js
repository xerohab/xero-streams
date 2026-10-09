import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Server-side search + cursor pagination for any entity.
 * @param {Object} opts
 * @param {string} opts.entity - Entity name (e.g. "Video", "Series")
 * @param {number} opts.limit - Page size (default 200)
 * @param {string} opts.sort - Sort field (default "-created_date")
 * @param {string[]} [opts.searchFields] - Fields to $regex search (e.g. ["title"])
 * @param {Function} [opts.buildQuery] - Async function(searchQuery) returning a custom filter
 */
export function usePaginatedSearch({ entity, limit = 200, sort = "-created_date", searchFields, buildQuery }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const searchRef = useRef("");
  const reqId = useRef(0);
  const firstRender = useRef(true);
  const configRef = useRef({ entity, limit, sort, searchFields, buildQuery });
  configRef.current = { entity, limit, sort, searchFields, buildQuery };

  const load = useCallback(async (reset) => {
    const { entity, limit, sort, searchFields, buildQuery } = configRef.current;
    const id = ++reqId.current;
    loadingRef.current = true;
    setLoading(true);
    try {
      let query = {};
      const sq = searchRef.current;
      if (sq) {
        if (buildQuery) {
          query = await buildQuery(sq);
        } else if (searchFields) {
          query.$or = searchFields.map(f => ({ [f]: { $regex: sq, $options: "i" } }));
        }
      }
      const page = await base44.entities[entity].filter(query, {
        sort,
        limit,
        cursor: reset ? undefined : cursorRef.current,
      });
      if (id !== reqId.current) return;
      const newItems = page.items || [];
      setItems(prev => reset ? newItems : [...prev, ...newItems]);
      cursorRef.current = page.next_cursor;
      hasMoreRef.current = !!page.has_more;
      setHasMore(hasMoreRef.current);
    } catch (e) {
      console.error("Paginated search error:", e);
    }
    if (id === reqId.current) {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      searchRef.current = search.trim();
      load(true);
      return;
    }
    const t = setTimeout(() => {
      searchRef.current = search.trim();
      cursorRef.current = null;
      hasMoreRef.current = true;
      setHasMore(true);
      load(true);
    }, 350);
    return () => clearTimeout(t);
  }, [search, load]);

  const loadMore = useCallback(() => {
    if (hasMoreRef.current && !loadingRef.current) load(false);
  }, [load]);

  const refresh = useCallback(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    load(true);
  }, [load]);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  return { items, loading, hasMore, loadMore, search, setSearch, refresh, removeItem, updateItem };
}