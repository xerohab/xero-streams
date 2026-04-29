import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, SkipForward, ChevronLeft, ChevronRight } from "lucide-react";
import useHls from "@/hooks/useHls";

/**
 * Full-screen cast overlay — works on mobile + desktop.
 * Handles HLS (.m3u8), MP4, MKV, WEBM, MOV and any other
 * format the browser's native video element can play.
 * Streams large files (3GB+) using range requests natively.
 */
export default function CastOverlay({ src, title, queue = [], startTime = 0, onClose }) {
  const videoRef = useRef(null);
  const didSetTime = useRef(false);

  // Build playlist: current + queue
  const [playlist, setPlaylist] = useState(() => [
    { src, title },
    ...queue.filter((q) => q.src),
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = playlist[currentIndex] || null;

  // HLS hook — returns null src if format is not HLS, falling back to native
  useHls(videoRef, current?.src || null);

  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Lock body scroll while overlay is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Set start time on first video only
  useEffect(() => {
    const el = videoRef.current;
    if (!el || didSetTime.current || currentIndex !== 0) return;

    const trySet = () => {
      if (startTime > 0 && el.readyState >= 1) {
        el.currentTime = startTime;
        didSetTime.current = true;
      }
    };

    if (el.readyState >= 1) {
      trySet();
    } else {
      el.addEventListener("loadedmetadata", trySet, { once: true });
      return () => el.removeEventListener("loadedmetadata", trySet);
    }
  }, [current, startTime]);

  // Countdown to next video
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { playNext(); return; }
    countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [countdown]);

  const playNext = useCallback(() => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
    setCurrentIndex((i) => i + 1);
  }, []);

  const playPrev = useCallback(() => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const cancelNext = useCallback(() => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
  }, []);

  const handleEnded = useCallback(() => {
    if (currentIndex < playlist.length - 1) {
      setCountdown(10);
    }
  }, [currentIndex, playlist.length]);

  const handleClose = useCallback(() => {
    clearTimeout(countdownRef.current);
    // Pause the video before closing to stop audio
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  }, [onClose]);

  if (!current) return null;

  const hasNext = currentIndex < playlist.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        touchAction: "manipulation",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Video element — key forces remount on src change */}
      <video
        key={current.src}
        ref={videoRef}
        controls
        autoPlay
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        controlsList="nodownload"
        preload="metadata"
        style={{ width: "100%", height: "100%", background: "#000", display: "block" }}
        onContextMenu={(e) => e.preventDefault()}
        onEnded={handleEnded}
        title={current.title}
      />

      {/* Top bar — title + close */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
        zIndex: 10,
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {hasPrev && (
            <button
              onClick={playPrev}
              style={navBtnStyle}
              title="Previous"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={playNext}
              style={navBtnStyle}
              title="Next"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "sans-serif", maxWidth: "60vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.title}
            {playlist.length > 1 && (
              <span style={{ color: "#aaa", fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                ({currentIndex + 1}/{playlist.length})
              </span>
            )}
          </span>
        </div>

        <button
          onClick={handleClose}
          style={{ ...navBtnStyle, pointerEvents: "auto" }}
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Up next countdown overlay */}
      {countdown !== null && hasNext && (
        <div style={{
          position: "absolute",
          bottom: 90,
          right: 20,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(10px)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          zIndex: 20,
          fontFamily: "sans-serif",
          minWidth: 200,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SkipForward size={14} color="#aaa" />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Up Next</span>
          </div>
          <span style={{
            color: "#bbb",
            fontSize: 12,
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {playlist[currentIndex + 1]?.title}
          </span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={cancelNext}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: "4px 8px" }}
            >
              Cancel
            </button>
            <button
              onClick={playNext}
              style={{
                background: "#e53e3e",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "7px 16px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Play in {countdown}s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: "rgba(0,0,0,0.55)",
  border: "none",
  borderRadius: "50%",
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#fff",
  flexShrink: 0,
};