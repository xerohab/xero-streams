import { base44 } from "@/api/base44Client";

// Canonical genre list — display names map 1:1 to the Series/Franchise `category` enum.
export const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama",
  "Education", "Fantasy", "Horror", "Music", "Mystery", "Romance", "Sci-Fi", "Thriller", "Other",
];

const TO_ENUM = {
  Action: "action", Adventure: "adventure", Animation: "animation", Comedy: "comedy",
  Crime: "crime", Documentary: "documentary", Drama: "drama", Education: "education",
  Fantasy: "fantasy", Horror: "horror", Music: "music", Mystery: "mystery",
  Romance: "romance", "Sci-Fi": "sci-fi", Thriller: "thriller", Other: "other",
};
const TO_DISPLAY = Object.fromEntries(Object.entries(TO_ENUM).map(([d, e]) => [e, d]));

/** Display name (e.g. "Sci-Fi") → enum value (e.g. "sci-fi"). */
export const genreToEnum = (displayName) => TO_ENUM[displayName] || "other";

/** Enum value (e.g. "sci-fi") → display name (e.g. "Sci-Fi"). Falls back to title-cased input. */
export const enumToGenre = (enumValue) =>
  TO_DISPLAY[enumValue] || (enumValue ? enumValue.charAt(0).toUpperCase() + enumValue.slice(1).replace("-", " ") : "");

/** Normalise any raw genre string (from AI, user, or legacy data) to a canonical display name. */
export function normaliseToGenre(raw) {
  if (!raw) return "";
  const key = String(raw).trim().toLowerCase();
  if (!key) return "";
  const direct = GENRE_OPTIONS.find((g) => g.toLowerCase() === key);
  if (direct) return direct;
  const fromEnum = TO_DISPLAY[key];
  if (fromEnum) return fromEnum;
  // common aliases
  const aliases = { "science fiction": "Sci-Fi", scifi: "Sci-Fi", "sci fi": "Sci-Fi", superhero: "Action", scary: "Horror", suspense: "Thriller", animated: "Animation", anime: "Animation", kids: "Other", family: "Other" };
  return aliases[key] || "";
}

/** Find or create a VideoCategory for a display-name genre; returns its id (null for "Other"/empty). */
export async function ensureVideoCategory(genreName) {
  if (!genreName || genreName === "Other") return null;
  const existing = await base44.entities.VideoCategory.filter({ title: genreName });
  if (existing[0]) return existing[0].id;
  const created = await base44.entities.VideoCategory.create({ title: genreName });
  return created.id;
}

/** Resolve a movie's current genre display name from its category_id. */
export function resolveVideoGenre(video, categories) {
  if (!video?.category_id) return "";
  const cat = categories?.find((c) => c.id === video.category_id);
  return cat?.title || "";
}