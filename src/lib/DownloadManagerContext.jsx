import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { downloadSingleVideo } from "@/lib/downloadUtils";

const DownloadManagerContext = createContext(null);

export function DownloadManagerProvider({ children }) {
  const [downloads, setDownloads] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const idCounter = useRef(0);

  const startDownload = useCallback(async (video) => {
    const dlId = `dl-${++idCounter.current}`;
    setDownloads((prev) => ({
      ...prev,
      [dlId]: { id: dlId, title: video.title, progress: 0, status: "downloading", error: null },
    }));
    setIsOpen(true);
    try {
      await downloadSingleVideo(video.id, (pct) => {
        setDownloads((prev) => ({
          ...prev,
          [dlId]: { ...prev[dlId], progress: pct },
        }));
      });
      setDownloads((prev) => ({
        ...prev,
        [dlId]: { ...prev[dlId], progress: 100, status: "complete" },
      }));
    } catch (err) {
      setDownloads((prev) => ({
        ...prev,
        [dlId]: { ...prev[dlId], status: "error", error: err.message || "Download failed" },
      }));
    }
  }, []);

  const clearDownload = useCallback((id) => {
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v.status === "downloading") next[k] = v;
      }
      return next;
    });
  }, []);

  return (
    <DownloadManagerContext.Provider
      value={{ downloads, startDownload, isOpen, setIsOpen, clearDownload, clearCompleted }}
    >
      {children}
    </DownloadManagerContext.Provider>
  );
}

export function useDownloadManager() {
  return useContext(DownloadManagerContext);
}