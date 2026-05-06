import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { encodeVideoUrl } from "@/lib/encodeVideoUrl";

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
          console.error("[HLS Error]", {
            fatal: data.fatal,
            type: data.type,
            details: data.details,
            url: data.url,
            response: data.response,
            src,
          });
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("[HLS] Fatal network error — retrying load");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("[HLS] Fatal media error — attempting recovery");
                hls.recoverMediaError();
                break;
              default:
                console.error("[HLS] Unrecoverable fatal error — destroying instance");
                hls.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = src;
        video.play().catch(() => {});
      }
    } else {
      // Native: mp4, mkv, webm, mov, avi, etc.
      const safeSrc = encodeVideoUrl(src);
      console.log("[useHls] Native playback for:", safeSrc);
      video.src = safeSrc;
      video.play().catch(() => {});
      video.addEventListener("error", () => {
        const e = video.error;
        console.error("[Video Error] Native playback error", {
          code: e?.code,
          message: e?.message,
          src: safeSrc,
          // code meanings: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
          meaning: ["", "ABORTED", "NETWORK_ERROR", "DECODE_ERROR", "SRC_NOT_SUPPORTED"][e?.code] || "UNKNOWN",
        });
      }, { once: false });
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