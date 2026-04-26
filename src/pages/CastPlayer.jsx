import React from "react";
import { useLocation } from "react-router-dom";

export default function CastPlayer() {
  const params = new URLSearchParams(useLocation().search);
  const src = params.get("src");
  const title = params.get("title") || "Video";
  const t = parseInt(params.get("t") || "0");

  if (!src) return <div style={{ background: "#000", color: "#fff", padding: 40 }}>No video source.</div>;

  return (
    <div style={{ margin: 0, padding: 0, background: "#000", width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <video
        src={src}
        controls
        autoPlay
        style={{ width: "100%", height: "100%", background: "#000" }}
        onLoadedMetadata={(e) => { if (t > 0) e.target.currentTime = t; }}
        title={title}
      />
    </div>
  );
}