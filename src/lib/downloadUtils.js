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
 * Downloads all episodes in a series or franchise sequentially.
 * Each file goes through the browser's native download manager
 * (avoids serverless memory/timeout limits on large video files).
 * onProgress receives { current, total, title }.
 */
export async function downloadSeriesZip(type, id, title, onProgress) {
  const query = type === "series" ? { series_id: id } : { franchise_id: id };
  const videos = await base44.entities.Video.filter(query, "sort_order");

  const downloadable = videos.filter((v) => v.video_url && !v.coming_soon);
  if (downloadable.length === 0) {
    throw new Error("No downloadable episodes found.");
  }

  for (let i = 0; i < downloadable.length; i++) {
    const video = downloadable[i];
    if (onProgress) onProgress({ current: i + 1, total: downloadable.length, title: video.title });

    // Validate auth + log the download via backend, then trigger direct browser download
    let res;
    try {
      res = await base44.functions.invoke("proxyDownload", { video_id: video.id });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err.message;
      throw new Error(msg);
    }
    if (res.data?.error) throw new Error(res.data.error);
    if (!res.data?.download_url) throw new Error("No download URL returned.");

    const a = document.createElement("a");
    a.href = res.data.download_url;
    a.download = res.data.filename || "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Give the browser time to register the download before starting the next
    await new Promise((r) => setTimeout(r, 1500));
  }
}