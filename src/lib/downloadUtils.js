import { base44 } from "@/api/base44Client";

/**
 * Downloads a single video through the proxy function.
 * The origin URL is never exposed to the browser — the file is fetched
 * server-side and returned with a Content-Disposition: attachment header.
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

  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch ? filenameMatch[1] : "download.mp4";

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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