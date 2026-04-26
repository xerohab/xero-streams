import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function CastPlayer() {
  const params = new URLSearchParams(useLocation().search);
  const initialSrc = params.get("src");
  const initialTitle = params.get("title") || "Video";
  const t = parseInt(params.get("t") || "0");

  // Parse the episode queue (subsequent episodes after the current one)
  let queueData = [];
  try {
    queueData = params.get("queue") ? JSON.parse(params.get("queue")) : [];
  } catch {}

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist] = useState([
    { src: initialSrc, title: initialTitle },
    ...queueData,
  ]);

  const current = playlist[currentIndex] || playlist[0];
  const videoRef = useRef(null);
  const userPausedRef = useRef(false);
  const [showNext, setShowNext] = useState(false);
  const countdownRef = useRef(null);
  const [countdown, setCountdown] = useState(null);

  // Update page title
  useEffect(() => {
    document.title = current?.title || "Video";
  }, [current]);

  // Set start time only on first load
  useEffect(() => {
    const el = videoRef.current;
    if (!el || currentIndex !== 0) return;
    const onMeta = () => {
      if (t > 0) el.currentTime = t;
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, []);

  // Prevent accidental pauses — auto-resume unless user deliberately paused
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handlePause = () => {
      if (!userPausedRef.current) {
        setTimeout(() => {
          if (el.paused && !el.ended && !userPausedRef.current) {
            el.play().catch(() => {});
          }
        }, 300);
      }
    };

    const handlePlay = () => {
      userPausedRef.current = false;
    };

    const handleClick = () => {
      // If currently playing, user wants to pause; if paused, user wants to play
      userPausedRef.current = !el.paused;
    };

    el.addEventListener("pause", handlePause);
    el.addEventListener("play", handlePlay);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("click", handleClick);
    };
  }, [current]);

  // Handle video ended — start countdown to next episode
  const handleEnded = () => {
    userPausedRef.current = false;
    const hasNext = currentIndex < playlist.length - 1;
    if (!hasNext) return;
    setShowNext(true);
    setCountdown(10);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      playNext();
      return;
    }
    countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [countdown]);

  const playNext = () => {
    clearTimeout(countdownRef.current);
    setShowNext(false);
    setCountdown(null);
    setCurrentIndex((i) => i + 1);
  };

  const cancelNext = () => {
    clearTimeout(countdownRef.current);
    setShowNext(false);
    setCountdown(null);
  };

  if (!current?.src) {
    return (
      <div style={{ background: "#000", color: "#fff", padding: 40, fontFamily: "sans-serif" }}>
        No video source provided.
      </div>
    );
  }

  return (
    <div
      style={{ margin: 0, padding: 0, background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        key={current.src}
        ref={videoRef}
        src={current.src}
        controls
        autoPlay
        playsInline
        x-webkit-airplay="allow"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        preload="auto"
        style={{ width: "100%", height: "100%", background: "#000", display: "block" }}
        onContextMenu={(e) => e.preventDefault()}
        onEnded={handleEnded}
        title={current.title}
      />

      {/* Up next overlay */}
      {showNext && currentIndex < playlist.length - 1 && (
        <div style={{
          position: "absolute",
          bottom: 80,
          right: 24,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          zIndex: 20,
          fontFamily: "sans-serif",
        }}>
          <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 14 }}>Up Next</p>
          <p style={{ color: "#aaa", margin: 0, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {playlist[currentIndex + 1]?.title}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={cancelNext}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={playNext}
              style={{ background: "#e53e3e", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
            >
              Play in {countdown}s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}