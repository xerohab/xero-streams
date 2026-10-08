// Shared genre display helpers: read-only normalisation for UI display.
// Works with both the new `genres` array field and legacy single-string fields.

import { normaliseToGenre } from "@/lib/genreAdmin";

/**
 * Returns an array of properly-capitalised genre names for a record.
 * Prefers the `genres` array; falls back to a legacy single genre string.
 * @param {object} record - Video, Series, or Franchise record
 * @param {string} [legacyField] - legacy field name or value (e.g. "category", or the raw value)
 * @returns {string[]} e.g. ["Horror", "Thriller", "Mystery"]
 */
export function getGenreList(record, legacyField) {
  if (!record) return [];
  if (Array.isArray(record.genres) && record.genres.length) {
    return record.genres.map((g) => capitaliseGenre(g)).filter(Boolean);
  }
  // Legacy: legacyField can be the raw value or a key on the record
  const raw = typeof legacyField === "string" && record[legacyField] ? record[legacyField] : legacyField;
  const name = normaliseToGenre(raw);
  return name ? [name] : [];
}

/**
 * Capitalises a genre name correctly.
 * "science fiction" → "Science Fiction", "horror" → "Horror", "sci-fi" → "Sci-Fi"
 */
export function capitaliseGenre(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  // Handle special cases
  const lower = trimmed.toLowerCase();
  const specials = {
    "sci-fi": "Sci-Fi",
    "science fiction": "Science Fiction",
    "tv-ma": "TV-MA",
    "tv-14": "TV-14",
    "tv-pg": "TV-PG",
    "pg-13": "PG-13",
  };
  if (specials[lower]) return specials[lower];
  // Title-case each word
  return trimmed.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * Returns a display string of genres separated by " · ".
 * @param {object} record
 * @param {string} [legacyField]
 * @param {number} [max] - max genres to show; remaining indicated with +N
 * @returns {string} e.g. "Horror · Thriller · Mystery" or "Crime · Drama · +2"
 */
export function genreString(record, legacyField, max) {
  const list = getGenreList(record, legacyField);
  if (!list.length) return "";
  if (max && list.length > max) {
    const shown = list.slice(0, max).join(" · ");
    return `${shown} · +${list.length - max}`;
  }
  return list.join(" · ");
}

/**
 * Returns the first N genre names for compact display.
 * @param {object} record
 * @param {string} [legacyField]
 * @param {number} [max=2]
 * @returns {string[]} e.g. ["Crime", "Drama"]
 */
export function genreShortList(record, legacyField, max = 2) {
  return getGenreList(record, legacyField).slice(0, max);
}