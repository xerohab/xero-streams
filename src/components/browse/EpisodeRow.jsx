import React from "react";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";

export default function EpisodeRow({ title, videos, isPremium }) {
  if (!videos || videos.length === 0) return null;

  return (
    <section className="mb-10">
      <SectionHeader title={title} />
      <EpisodeGrid>
        {videos.map((video) => (
          <EpisodeCard key={video.id} video={video} isPremium={isPremium} />
        ))}
      </EpisodeGrid>
    </section>
  );
}