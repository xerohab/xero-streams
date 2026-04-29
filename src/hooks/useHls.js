import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * Attaches HLS.js to a video element when the src is an m3u8 stream.
 * Falls back to native playback for mp4 and other formats.
 */
export default function useHls(videoRef, src) {
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    // Always tear down existing HLS instance first
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // If no src (e.g. casting), stop and clear the video element
    if (!src) {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      return;
    }

    if (!video) return;

    const isHls = src.includes(".m3u8");

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      }
    } else {
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