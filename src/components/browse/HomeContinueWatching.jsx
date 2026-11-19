import { hasPlaybackSource } from "@/lib/parentalControls";
import React, { useEffect, useState } from "react";
import { getAll, removeProgress } from "@/hooks/useContinueWatching";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import HomeSectionHeader from "@/components/browse/HomeSectionHeader";

export default function HomeContinueWatching({ videos, series }) {
  const read = () => getAll().filter((item) => !item.is_adult && item.currentTime > 0 && item.progress > 0 && item.progress <= 95);
  const [items, setItems] = useState(read);
  useEffect(() => {
    const refresh = () => setItems(read());
    window.addEventListener("xero-progress-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("xero-profile-changed", refresh);
    return () => { window.removeEventListener("xero-progress-updated", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("xero-profile-changed", refresh); };
  }, []);
  const playable = new Map(videos.filter(video => !video.coming_soon && hasPlaybackSource(video)).map(video => [video.id, video]));
  const visible = items.filter(item => playable.has(item.id));
  if (!visible.length) return null;
  return (
    <section className="home-section" id="home-continue">
      <HomeSectionHeader title="Continue Watching" />
      <EpisodeGrid landscape>
        {visible.slice(0, 7).map((saved) => {
          const video = playable.get(saved.id);
          const season = series.find((item) => item.id === video?.series_id);
          const display = { ...video, ...saved, title: season ? `${season.title} · ${video.title}` : video.title };
          return <EpisodeCard key={saved.id} video={display} landscape playable href={`/watch?id=${saved.id}&t=${Math.floor(saved.currentTime)}`} onRemove={removeProgress} />;
        })}
      </EpisodeGrid>
    </section>
  );
}