import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function CastPlayer() {
  const params = new URLSearchParams(useLocation().search);
  const src = params.get("src");
  const title = params.get("title") || "Video";
  const t = parseInt(params.get("t") || "0");
  const videoRef = useRef(null);

  useEffect(() => {
    // Set start time once metadata is ready
    const el = videoRef.current;
    if (!el) return;
    const onMeta = () => {
      if (t > 0) el.currentTime = t;
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [t]);

  useEffect(() => {
    // Update page title for cast receiver display
    document.title = title;
  }, [title]);

  if (!src) {
    return (
      <div style={{ background: "#000", color: "#fff", padding: 40, fontFamily: "sans-serif" }}>
        No video source provided.
      </div>
    );
  }

  return (
    <div
      style={{ margin: 0, padding: 0, background: "#000", width: "100vw", height: "100vh", overflow: "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        autoPlay
        playsInline
        // x-webkit-airplay enables AirPlay on Safari/iOS
        x-webkit-airplay="allow"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        preload="auto"
        style={{ width: "100%", height: "100%", background: "#000", display: "block" }}
        onContextMenu={(e) => e.preventDefault()}
        title={title}
      />
    </div>
  );
}