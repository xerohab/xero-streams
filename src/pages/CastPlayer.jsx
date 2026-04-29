import React, { useRef, useState, useEffect } from "react";
import { Cast } from "lucide-react";
import useHls from "@/hooks/useHls";

export default function CastPlayer() {
  // No URL params — video is always sent via postMessage to keep source URL hidden
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const current = playlist[currentIndex] || null;

  const videoRef = useRef(null);
  const userPausedRef = useRef(false);
  useHls(videoRef, current?.src || null);
  const [showNext, setShowNext] = useState(false);
  const countdownRef = useRef(null);
  const [countdown, setCountdown] = useState(null);

  // Signal to the opener that CastPlayer is ready to receive messages
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "CAST_READY" }, "*");
    }
  }, []);

  // Listen for messages from the parent window to play a new video
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "CAST_PLAY") {
        const { src, title, queue, t } = e.data;
        const newPlaylist = [{ src, title }, ...(queue || [])];
        setPlaylist(newPlaylist);
        setCurrentIndex(0);
        setStartTime(parseInt(t) || 0);
        setShowNext(false);
        setCountdown(null);
        clearTimeout(countdownRef.current);
        userPausedRef.current = false;
        didSetTime.current = false;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Update page title
  useEffect(() => {
    document.title = current?.title || "Cast Ready";
  }, [current]);

  // Set start time on first video load only
  const didSetTime = useRef(false);
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

  // Handle video ended — countdown to next
  const handleEnded = () => {
    userPausedRef.current = false;
    if (currentIndex >= playlist.length - 1) return;
    setShowNext(true);
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
    setShowNext(false);
    setCountdown(null);
    setCurrentIndex((i) => i + 1);
  };

  const cancelNext = () => {
    clearTimeout(countdownRef.current);
    setShowNext(false);
    setCountdown(null);
  };

  // Standby screen
  if (!current) {
    return (
      <div style={{
        margin: 0, padding: 0, background: "#000", width: "100vw", height: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "sans-serif", gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><path d="M10 15l5-3-5-3z"/>
          </svg>
        </div>
        <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>Cast Ready</p>
        <p style={{ color: "#888", fontSize: 14, margin: 0, textAlign: "center", maxWidth: 280 }}>
          Select any video on the site and it will play here automatically.
        </p>
        <div style={{
          marginTop: 8, padding: "6px 16px", background: "rgba(255,255,255,0.08)",
          borderRadius: 20, color: "#aaa", fontSize: 12,
        }}>
          🟢 Connected
        </div>
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
      {showNext && currentIndex < playlist.length - 1 && (
        <div style={{
          position: "absolute", bottom: 80, right: 24,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          borderRadius: 12, padding: "16px 20px",
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
          zIndex: 20, fontFamily: "sans-serif",
        }}>
          <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 14 }}>Up Next</p>
          <p style={{ color: "#aaa", margin: 0, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {playlist[currentIndex + 1]?.title}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={cancelNext} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>
              Cancel
            </button>
            <button onClick={playNext} style={{ background: "#e53e3e", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
              Play in {countdown}s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}