/**
 * Safely encodes a video URL so special characters in the path
 * (spaces, &, (), etc.) don't break browser video playback.
 * Preserves already-encoded sequences and the query string / hash.
 */
export function encodeVideoUrl(src) {
  if (!src) return src;
  try {
    const url = new URL(src);
    url.pathname = url.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return url.toString();
  } catch {
    return src;
  }
}