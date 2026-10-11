import React from "react";
import { Clock } from "lucide-react";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

export default function HistorySection({ completedVideos, isPremium  = undefined}) {
  return (
    <section>
      <SectionHeader title="Viewing History" subtitle="Titles you've finished watching." />
      {completedVideos.length === 0 ? (
        <EmptyState icon={Clock} title="No history yet" text="Titles you finish watching will be listed here." ctaTo="/" />
      ) : (
        <EpisodeGrid>
          {completedVideos.slice(0, 24).map((video) => (
            <EpisodeCard key={video.id} video={video} isPremium={isPremium} watched />
          ))}
        </EpisodeGrid>
      )}
    </section>
  );
}
