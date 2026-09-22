import { base44 } from "@/api/base44Client";

/**
 * Downloads a single video.
 * 1. Backend validates auth/subscription and logs the download, returns the URL.
 * 2. Browser fetches the file directly (fast, no serverless timeout) with progress.
 * 3. Creates a Blob and triggers a forced download (works for cross-origin).
 * Falls back to anchor navigation if CORS blocks the fetch.
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

  const data = await response.json();
  if (!data.download_url) throw new Error("No download URL returned");

  const filename = data.filename || "download.mp4";

  try {
    const fileResponse = await fetch(data.download_url);
    if (!fileResponse.ok) throw new Error("File unavailable");

    const contentLength = parseInt(fileResponse.headers.get("Content-Length") || "0", 10);

    if (fileResponse.body) {
      const reader = fileResponse.body.getReader();
      const chunks = [];
      let receivedLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (onProgress && contentLength > 0) {
          onProgress(Math.min(99, Math.round((receivedLength / contentLength) * 100)));
        }
      }
      if (onProgress) onProgress(100);
      const blob = new Blob(chunks, { type: "video/mp4" });
      triggerBlobDownload(blob, filename);
    } else {
      const blob = await fileResponse.blob();
      triggerBlobDownload(blob, filename);
    }
  } catch (fetchErr) {
    // CORS or network error — fall back to direct navigation
    const a = document.createElement("a");
    a.href = data.download_url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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