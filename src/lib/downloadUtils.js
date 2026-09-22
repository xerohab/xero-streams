import { base44 } from "@/api/base44Client";

/**
 * Downloads a single video through the proxy function.
 * Streams the response so onProgress(bytesPercent) fires as data arrives,
 * giving the user real-time progress feedback. The origin URL is never
 * exposed to the browser.
 */
export async function downloadSingleVideo(videoId, onProgress) {
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

  const contentLength = parseInt(response.headers.get("Content-Length") || "0", 10);

  // Stream with progress tracking when possible
  if (onProgress && response.body && contentLength > 0) {
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      onProgress(Math.min(100, Math.round((receivedLength / contentLength) * 100)));
    }

    const blob = new Blob(chunks, { type: "video/mp4" });
    triggerBlobDownload(blob, filename);
  } else {
    // Fallback: no streaming progress available
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
  }
}

function triggerBlobDownload(blob, filename) {
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
export async function downloadSeriesZip(type, id, title, onProgress) {
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