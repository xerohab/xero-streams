import React, { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import useHls from "@/hooks/useHls";

export default function CastOverlay({ src, title, queue = [], startTime = 0, onClose }) {
  const videoRef = useRef(null);
  const userPausedRef = useRef(false);
  const didSetTime = useRef(false);

  const [playlist, setPlaylist] = useState([{ src, title }, ...queue]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = playlist[currentIndex];
  useHls(videoRef, current?.src || null);

  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Set start time on first load
  useEffect(() => {
    const el = videoRef.current;
    if (!el || didSetTime.current || currentIndex !== 0) return;
    const onMeta = () => {
      if (startTime > 0) {
        el.currentTime = startTime;
        didSetTime.current = true;
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [current]);

  // No accidental-pause override — let native controls work normally

  const handleEnded = () => {
    userPausedRef.current = false;
    if (currentIndex >= playlist.length - 1) return;
    setCountdown(10);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { playNext(); return; }
    countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [countdown]);

  const playNext = () => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
    setCurrentIndex((i) => i + 1);
  };

  const cancelNext = () => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
  };

  // Lock body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#000", zIndex: 9999,
        display: "flex", flexDirection: "column",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 10000,
          background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
          width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff",
        }}
      >
        <X size={20} />
      </button>

      <video
        key={current.src}
        ref={videoRef}
        controls
        autoPlay
        playsInline
        x-webkit-airplay="allow"
        controlsList="nodownload"
        preload="auto"
        style={{ width: "100%", height: "100%", background: "#000", display: "block" }}
        onContextMenu={(e) => e.preventDefault()}
        onEnded={handleEnded}
        title={current.title}
      />

      {/* Up next overlay */}
      {countdown !== null && currentIndex < playlist.length - 1 && (
        <div style={{
          position: "absolute", bottom: 80, right: 16,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          borderRadius: 12, padding: "14px 18px",
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
          zIndex: 10001, fontFamily: "sans-serif",
        }}>
          <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 14 }}>Up Next</p>
          <p style={{ color: "#aaa", margin: 0, fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {playlist[currentIndex + 1]?.title}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={cancelNext} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>Cancel</button>
            <button onClick={playNext} style={{ background: "#e53e3e", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
              Play in {countdown}s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}