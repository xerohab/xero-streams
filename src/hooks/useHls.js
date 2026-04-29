import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * Attaches HLS.js to a video element for m3u8 streams.
 * Falls back to native for mp4, mkv, webm, and other formats.
 * Tuned for large files (up to 3GB+) with generous buffer settings.
 */
export default function useHls(videoRef, src) {
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    // Tear down any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!src) {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      return;
    }

    if (!video) return;

    const isHls = src.toLowerCase().includes(".m3u8");

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // Large buffer settings for big files
          maxBufferLength: 120,
          maxMaxBufferLength: 600,
          maxBufferSize: 256 * 1024 * 1024, // 256MB buffer
          maxBufferHole: 2,
          highBufferWatchdogPeriod: 10,
          startFragPrefetch: true,
          testBandwidth: true,
          progressive: true,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad(); // retry
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = src;
      }
    } else {
      // Native: mp4, mkv, webm, mov, avi, etc.
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return hlsRef;
}