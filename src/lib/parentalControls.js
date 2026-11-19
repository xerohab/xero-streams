// Shared UI policy: unrated or unknown content is not suitable for Kids profiles.
const kidsRatings=new Set(["U","G","PG","TV-Y","TV-Y7","TV-Y7-FV","TV-G","TV-PG","BBFC U","BBFC PG"]);
export function allowsKidsContent(record){
 return !!record && !record.is_adult && kidsRatings.has(String(record.age_rating||"").trim().toUpperCase());
}


export function hasPlaybackSource(record) {
  return Boolean(record?.has_playback || record?.video_url);
}
