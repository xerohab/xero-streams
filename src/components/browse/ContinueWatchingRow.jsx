import React, { useState } from "react";
import { getAll, removeProgress } from "@/hooks/useContinueWatching";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";

export default function ContinueWatchingRow({ isAdult = false }) {
  const [items, setItems] = useState(() => getAll().filter((item) => item.is_adult === isAdult));

  if (items.length === 0) return null;

  const handleRemove = (id) => {
    removeProgress(id);
    setItems(getAll().filter((item) => item.is_adult === isAdult));
  };

  return (
    <div className="mb-12">
      <SectionHeader title="Continue Watching" />
      <EpisodeGrid>
        {items.map((item) => (
          <EpisodeCard
            key={item.id}
            video={item}
            playable
            href={`/watch?id=${item.id}&t=${Math.floor(item.currentTime)}`}
            onRemove={handleRemove}
          />
        ))}
      </EpisodeGrid>
    </div>
  );
}