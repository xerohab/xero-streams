import { base44 } from "@/api/base44Client";

// Master genre list — display names stored directly in the `genres` array field.
export const GENRE_OPTIONS = [
  "Action", "Action Comedy", "Action Thriller", "Adventure", "Animation", "Anime",
  "Anthology", "Art House", "Biopic", "Black Comedy", "Body Horror",
  "Business & Entrepreneurship", "Children & Family", "Combat Sports", "Comedy",
  "Cooking & Food", "Cosmic Horror", "Costume Drama", "Courtroom Drama", "Crime",
  "Crime Thriller", "Cyberpunk", "Cyber Thriller", "Dark Fantasy", "Disaster",
  "Documentary", "Docudrama", "Drama", "Dystopian", "Educational", "Erotic Thriller",
  "Esports", "Extreme Sports", "Fairy Tale", "Fantasy", "Film Noir", "Game Show",
  "Governance & Politics", "Heist", "Historical", "Historical Drama", "Horror",
  "Horror Comedy", "House & Garden", "Human Interest", "Industrial & Manufacturing",
  "Isekai", "Kaiju", "Late Night", "Life Extension & Wellness", "Live Performance",
  "Lucha Libre", "Martial Arts", "Mecha", "Medical Drama", "Military", "Mockumentary",
  "Monster", "Motor Sports", "Music & Dance", "Musical", "Mystery", "Nature & Wildlife",
  "Neo-Noir", "News & Current Affairs", "Paranormal", "Period Piece", "Political Thriller",
  "Post-Apocalyptic", "Psychological Horror", "Psychological Thriller", "Public Access",
  "Reality TV", "Religion & Spirituality", "Romance", "Romantic Comedy", "Satire",
  "Science & Technology", "Science Fiction", "Sci-Fi Fantasy", "Slasher", "Slice of Life",
  "Soap Opera", "Space Opera", "Sports", "Sports Documentary", "Sports Drama",
  "Spy Thriller", "Stand-Up Comedy", "Superhero", "Supernatural", "Survival", "Talk Show",
  "Teen Drama", "Travel & Tourism", "True Crime", "Urban Fantasy", "Variety Show",
  "War", "Western", "Wrestling", "Wrestling Documentary", "Wrestling Drama", "Zombie",
];

// Map legacy enum values (Series/Franchise `category`) to new display names.
const ENUM_TO_DISPLAY = {
  action: "Action", adventure: "Adventure", animation: "Animation", comedy: "Comedy",
  crime: "Crime", documentary: "Documentary", drama: "Drama", education: "Educational",
  fantasy: "Fantasy", horror: "Horror", music: "Music & Dance", mystery: "Mystery",
  romance: "Romance", "sci-fi": "Science Fiction", thriller: "Thriller", other: "",
};

// Common aliases → canonical display name.
const ALIASES = {
  "science fiction": "Science Fiction", "science-fiction": "Science Fiction",
  scifi: "Science Fiction", "sci fi": "Science Fiction", "sci-fi": "Science Fiction",
  superhero: "Superhero", scary: "Horror", suspense: "Thriller", animated: "Animation",
  anime: "Anime", kids: "Children & Family", family: "Children & Family",
  "family & kids": "Children & Family", children: "Children & Family",
  documentaries: "Documentary", docs: "Documentary", comedies: "Comedy", dramas: "Drama",
  "action & adventure": "Action", "music & dance": "Music & Dance",
};

const IGNORED = new Set(["other", "others", "uncategorized", "uncategorised", "none", "unknown", "n/a", ""]);

/** Normalise a single raw genre string to a canonical display name (or "" if unknown/ignored). */
export function normaliseToGenre(raw) {
  if (!raw) return "";
  const key = String(raw).trim().toLowerCase();
  if (!key || IGNORED.has(key)) return "";
  const direct = GENRE_OPTIONS.find((g) => g.toLowerCase() === key);
  if (direct) return direct;
  if (ENUM_TO_DISPLAY[key]) return ENUM_TO_DISPLAY[key];
  if (ALIASES[key]) return ALIASES[key];
  return "";
}

/**
 * Normalise raw genre input (string, comma-separated, or array) into an array of
 * canonical display names, de-duplicated, preserving order.
 */
export function normaliseToGenres(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(normaliseToGenre).filter(Boolean))];
  }
  return [...new Set(String(raw).split(/[,;|]/).map((p) => normaliseToGenre(p)).filter(Boolean))];
}

/** Legacy: display name → old enum value. Maps only the genres that have enum equivalents. */
const DISPLAY_TO_ENUM = {
  Action: "action", Adventure: "adventure", Animation: "animation", Comedy: "comedy",
  Crime: "crime", Documentary: "documentary", Drama: "drama", Educational: "education",
  Fantasy: "fantasy", Horror: "horror", "Music & Dance": "music", Mystery: "mystery",
  Romance: "romance", "Science Fiction": "sci-fi", Thriller: "thriller",
};
export const genreToEnum = (displayName) => DISPLAY_TO_ENUM[displayName] || "other";

/** Legacy: enum value → display name. */
export const enumToGenre = (enumValue) => ENUM_TO_DISPLAY[enumValue] || "";

/** Resolve a movie's current genre display names from its `genres` array (fallback to category_id). */
export function resolveVideoGenres(video, categories) {
  if (video?.genres?.length) return [...video.genres];
  if (!video?.category_id) return [];
  const cat = categories?.find((c) => c.id === video.category_id);
  const name = cat ? normaliseToGenre(cat.title) : "";
  return name ? [name] : [];
}

/** Legacy single-genre resolver (returns first genre or ""). */
export function resolveVideoGenre(video, categories) {
  return resolveVideoGenres(video, categories)[0] || "";
}

/** Find or create a VideoCategory for a display-name genre; returns its id (legacy). */
export async function ensureVideoCategory(genreName) {
  if (!genreName) return null;
  const existing = await base44.entities.VideoCategory.filter({ title: genreName });
  if (existing[0]) return existing[0].id;
  const created = await base44.entities.VideoCategory.create({ title: genreName });
  return created.id;
}