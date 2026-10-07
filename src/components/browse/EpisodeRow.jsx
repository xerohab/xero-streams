import React from "react";
import EpisodeCard from "./EpisodeCard";

export default function EpisodeRow({ title, videos, isPremium }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10 px-4 md:px-12 lg:px-16">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-start">
        {videos.map((video, i) => (
          <EpisodeCard key={video.id} video={video} isPremium={isPremium} />
        ))}
      </div>
    </div>
  );
}