// Genre helpers: read-only normalisation of the metadata that already exists on
// Series, Franchise and Video (via VideoCategory). Nothing here writes to records.

export const GENRE_ORDER = [
  "Horror", "Drama", "Comedy", "Action", "Thriller", "Sci-Fi", "Fantasy",
  "Romance", "Crime", "Mystery", "Adventure", "Animation", "Documentary", "Family",
];

const ALIASES = {
  "sci-fi": "Sci-Fi", "sci fi": "Sci-Fi", scifi: "Sci-Fi", "science fiction": "Sci-Fi", "science-fiction": "Sci-Fi", sf: "Sci-Fi",
  documentaries: "Documentary", docs: "Documentary", comedies: "Comedy", dramas: "Drama",
  animated: "Animation", anime: "Animation", kids: "Family", "family & kids": "Family",
  "action & adventure": "Action", suspense: "Thriller", scary: "Horror",
};
const IGNORED = new Set(["other", "others", "uncategorized", "uncategorised", "none", "unknown", "n/a", ""]);

/** Turn any raw label (or comma separated labels) into canonical genre names. */
export function normaliseGenres(raw) {
  if (!raw) return [];
  return String(raw).split(/[,;|]/).map((part) => {
    const key = part.trim().toLowerCase();
    if (IGNORED.has(key)) return null;
    if (ALIASES[key]) return ALIASES[key];
    const known = GENRE_ORDER.find((g) => g.toLowerCase() === key);
    return known || key.replace(/\b\w/g, (c) => c.toUpperCase());
  }).filter(Boolean);
}

const byOrder = (a, b) => {
  const ia = GENRE_ORDER.indexOf(a); const ib = GENRE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

/**
 * Builds Map<groupId, Set<genre>> for catalogue groups (franchise | series | video).
 * - Series: its own category.
 * - Movie: its VideoCategory title (if any).
 * - Franchise: its own category plus the genres of eligible members for this page
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
  const videoGenres = (v) => normaliseGenres(categoryTitle.get(v.category_id));
  const seriesGenres = (s) => normaliseGenres(s.category);

  const rootBag = new Map();
  const add = (rootId, genres) => {
    if (!rootId || !genres.length) return;
    if (!rootBag.has(rootId)) rootBag.set(rootId, new Set());
    genres.forEach((g) => rootBag.get(rootId).add(g));
  };
  franchises.forEach((f) => add(rootOf(f.id), normaliseGenres(f.category)));
  if (type !== "video") series.forEach((s) => s.franchise_id && add(rootOf(s.franchise_id), seriesGenres(s)));
  if (type !== "series") videos.filter((v) => !v.series_id && v.franchise_id).forEach((v) => add(rootOf(v.franchise_id), videoGenres(v)));

  const index = new Map();
  groups.forEach((g) => {
    const genres = g.type === "franchise" ? rootBag.get(g.data.id) : new Set(g.type === "series" ? seriesGenres(g.data) : videoGenres(g.data));
    index.set(g.data.id, genres || new Set());
  });
  return index;
}

/** Genres that really exist in the given groups, in a stable, familiar order. */
export function listGenres(groups, index) {
  const counts = new Map();
  groups.forEach((g) => index.get(g.data.id)?.forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1)));
  return [...counts.keys()].sort(byOrder).map((name) => ({ name, count: counts.get(name) }));
}