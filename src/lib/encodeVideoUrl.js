/**
 * Safely encodes a video URL so special characters in the path
 * (spaces, &, (), etc.) don't break browser video playback.
 * - HTML-decodes first (handles &amp; stored in DB)
 * - Then percent-encodes the path segments properly
 * - Preserves already-encoded sequences
 */
export function encodeVideoUrl(src) {
  if (!src) return src;
  // HTML-decode first (e.g. &amp; → &, &#39; → ')
  const txt = document.createElement("textarea");
  txt.innerHTML = src;
  const decoded = txt.value;
  try {
    const url = new URL(decoded);
    url.pathname = url.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return url.toString();
  } catch {
    return decoded;
  }
}