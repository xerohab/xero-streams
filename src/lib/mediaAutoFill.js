import { base44 } from "@/api/base44Client";
import { normaliseToGenres } from "@/lib/genreAdmin";

export async function fetchMediaAutoFill(input) {
  const response = await base44.functions.invoke("aiMediaInfo", input);
  const data = response.data;
  if (data?.error || (!data?.title && !data?.description)) {
    throw new Error(data?.error || "Couldn't find information for this video.");
  }
  return response;
}

export function mediaInfoUpdates(data) {
  const updates = {};
  if (data.title) updates.title = data.title;
  if (data.description) updates.description = data.description;
  const genres = normaliseToGenres(data.genres);
  if (genres.length) updates.genres = genres;
  if (data.content_type === "episode") {
    updates.content_type = "episode";
    if (data.season_number) updates.season_number = String(data.season_number);
    if (data.episode_number) updates.episode_number = String(data.episode_number);
  }
  return updates;
}