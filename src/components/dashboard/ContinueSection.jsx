import React from "react";
import { Play } from "lucide-react";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

export default function ContinueSection({ items, isPremium }) {
  return (
    <section>
      <SectionHeader title="Continue Watching" />
      {items.length === 0 ? (
        <EmptyState icon={Play} title="Nothing in progress" text="Start watching and anything you leave unfinished will appear here." ctaTo="/" />
      ) : (
        <EpisodeGrid landscape>
          {items.map(({ video }) => (
            <EpisodeCard key={video.id} video={video} isPremium={isPremium} landscape />
          ))}
        </EpisodeGrid>
      )}
    </section>
  );
}