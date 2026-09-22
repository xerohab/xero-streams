import { base44 } from "@/api/base44Client";

/**
 * Downloads a single video.
 * The backend function validates auth/subscription and logs the download,
 * then returns the direct URL. The browser downloads directly from the
 * origin with its native download manager (progress bar), avoiding
 * serverless function timeouts on large files.
 */
export async function downloadSingleVideo(videoId) {
  const response = await base44.functions.fetch("/proxyDownload", {
    method: "POST",
    body: JSON.stringify({ video_id: videoId }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let errMsg = "Download failed. Please try again.";
    try {
      const errData = await response.json();
      errMsg = errData.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  if (!data.download_url) throw new Error("No download URL returned");

  const a = document.createElement("a");
  a.href = data.download_url;
  a.download = data.filename || "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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