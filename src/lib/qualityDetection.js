export async function detectVideoQuality(url, title = "") {
  // 1. Text-based detection first (catches CAM/TS which can't be easily found via resolution)
  const text = `${title || ''} ${url || ''}`.toLowerCase();
  
  if (text.includes("cam") || text.includes("ts") || text.includes("telesync") || text.includes("hdcam")) {
    return "CAM";
  }

  // 2. Play a few seconds (metadata load) to detect resolution
  if (url) {
    try {
      const resolution = await new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        
        // Timeout to prevent hanging if the video is slow or blocked
        const timeout = setTimeout(() => {
          video.src = ""; // Stop loading
          resolve(null);
        }, 3000); // Wait max 3 seconds for metadata

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          resolve(null); // Probably CORS or bad URL, fallback to text
        };

        video.src = url;
      });

      if (resolution && resolution.width && resolution.height) {
        const w = resolution.width;
        const h = resolution.height;
        // Check for 4K
        if (w >= 3800 || h >= 2000) return "4K";
        // Check for Full HD (1080p)
        if (w >= 1900 || h >= 1000) return "Full HD";
        // Check for HD (720p)
        if (w >= 1200 || h >= 700) return "HD";
      }
    } catch (err) {
      console.warn("Quality auto-detect via video metadata failed:", err);
    }
  }

  // 3. Fallback to text parsing for standard resolutions if video element failed or was inconclusive
  if (text.includes("4k") || text.includes("2160") || text.includes("uhd")) return "4K";
  if (text.includes("1080") || text.includes("full hd") || text.includes("fhd")) return "Full HD";
  if (text.includes("720") || text.includes(" hd") || text.includes("hd ") || text.endsWith("hd")) return "HD";

  return "Unknown";
}