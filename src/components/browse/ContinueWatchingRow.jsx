import React, { useState, useEffect } from "react";
import { getAll, removeProgress } from "@/hooks/useContinueWatching";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";

export default function ContinueWatchingRow({ isAdult = false }) {
  const [items, setItems] = useState(() => getAll().filter((item) => item.is_adult === isAdult));
  useEffect(() => {
    const refresh = () => setItems(getAll().filter((item) => item.is_adult === isAdult));
    window.addEventListener("xero-progress-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("xero-progress-updated", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, [isAdult]);

  if (items.length === 0) return null;

  const handleRemove = (id) => {
    removeProgress(id);
    setItems(getAll().filter((item) => item.is_adult === isAdult));
  };

  return (
    <section className="xero-section">
      <SectionHeader title="Continue Watching" />
      <EpisodeGrid landscape>
        {items.map((item) => (
          <EpisodeCard
            key={item.id}
            video={item}
            landscape
            playable
            href={`/watch?id=${item.id}&t=${Math.floor(item.currentTime)}`}
            onRemove={handleRemove}
          />
        ))}
      </EpisodeGrid>
    </section>
  );
}