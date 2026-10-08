// Genre helpers: read-only normalisation of the metadata that already exists on
// Series, Franchise and Video. Builds the genre index used by browse filters.

import { normaliseToGenre } from "@/lib/genreAdmin";

/**
 * Returns the canonical genre display names for a single record, preferring the
 * `genres` array field and falling back to the legacy single genre.
 */
function recordGenres(record, legacyLabel) {
  if (record?.genres?.length) return [...record.genres];
  const name = normaliseToGenre(legacyLabel);
  return name ? [name] : [];
}

/**
 * Builds Map<groupId, Set<genre>> for catalogue groups (franchise | series | video).
 * - Series: its own genres.
 * - Movie: its own genres (fallback to VideoCategory title).
 * - Franchise: its own genres plus the genres of eligible members for this page
 *   (series on the TV page, standalone movies on the Movies page), including sub-collections.
 * Loose episodes are never included.
 */
export function buildGenreIndex(groups, { franchises, series, videos, categories, type }) {
  const categoryTitle = new Map(categories.map((c) => [c.id, c.title]));
  const franchiseById = new Map(franchises.map((f) => [f.id, f]));
  const rootOf = (id) => {
    let node = franchiseById.get(id);
    const seen = new Set();
    while (node?.parent_id && franchiseById.has(node.parent_id) && !seen.has(node.id)) { seen.add(node.id); node = franchiseById.get(node.parent_id); }
    return node?.id;
  };
  const videoGenres = (v) => recordGenres(v, categoryTitle.get(v.category_id));
  const seriesGenres = (s) => recordGenres(s, s.category);

  const rootBag = new Map();
  const add = (rootId, genres) => {
    if (!rootId || !genres.length) return;
    if (!rootBag.has(rootId)) rootBag.set(rootId, new Set());
    genres.forEach((g) => rootBag.get(rootId).add(g));
  };
  franchises.forEach((f) => add(rootOf(f.id), recordGenres(f, f.category)));
  if (type !== "video") series.forEach((s) => s.franchise_id && add(rootOf(s.franchise_id), seriesGenres(s)));
  if (type !== "series") videos.filter((v) => !v.series_id && v.franchise_id).forEach((v) => add(rootOf(v.franchise_id), videoGenres(v)));

  const index = new Map();
  groups.forEach((g) => {
    const genres = g.type === "franchise" ? rootBag.get(g.data.id) : new Set(g.type === "series" ? seriesGenres(g.data) : videoGenres(g.data));
    index.set(g.data.id, genres || new Set());
  });
  return index;
}

/** Genres that really exist in the given groups, sorted alphabetically with counts. */
export function listGenres(groups, index) {
  const counts = new Map();
  groups.forEach((g) => index.get(g.data.id)?.forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1)));
  return [...counts.keys()].sort((a, b) => a.localeCompare(b)).map((name) => ({ name, count: counts.get(name) }));
}