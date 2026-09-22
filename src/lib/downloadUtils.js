import { base44 } from "@/api/base44Client";

/**
 * Downloads a single video through the proxy function.
 * Uses a hidden iframe so the download starts instantly with the browser's
 * native progress bar — no blob buffering in JS memory, no page navigation.
 * The origin URL is never exposed to the browser.
 */
export function downloadSingleVideo(videoId) {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `/functions/proxyDownload?video_id=${encodeURIComponent(videoId)}`;
  document.body.appendChild(iframe);
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 120000);
}

/**
 * Downloads a full series or franchise as a ZIP bundle.
 */
export async function downloadSeriesZip(type, id, title) {
  const res = await base44.functions.invoke("downloadSeriesZip", { type, id, title });

  if (res.data?.error) throw new Error(res.data.error);
  if (!res.data?.signed_url) throw new Error("Failed to generate download link.");

  const a = document.createElement("a");
  a.href = res.data.signed_url;
  a.download = res.data.filename || `${title}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}