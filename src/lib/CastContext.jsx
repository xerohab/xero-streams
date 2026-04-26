import React, { createContext, useContext, useState, useCallback } from "react";
import CastOverlay from "@/components/cast/CastOverlay";

const CastContext = createContext(null);

export function CastProvider({ children }) {
  const [castData, setCastData] = useState(null); // { src, title, queue, startTime }

  const openCast = useCallback((src, title, queue = [], startTime = 0) => {
    setCastData({ src, title, queue, startTime });
  }, []);

  const closeCast = useCallback(() => {
    setCastData(null);
  }, []);

  return (
    <CastContext.Provider value={{ openCast, closeCast, isCasting: !!castData }}>
      {children}
      {castData && (
        <CastOverlay
          src={castData.src}
          title={castData.title}
          queue={castData.queue}
          startTime={castData.startTime}
          onClose={closeCast}
        />
      )}
    </CastContext.Provider>
  );
}

export function useCast() {
  return useContext(CastContext);
}