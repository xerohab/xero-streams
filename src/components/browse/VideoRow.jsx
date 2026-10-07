import React from "react";
import VideoCard from "@/components/browse/VideoCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";

export default function VideoRow({ title, videos, limit }) {
  if (!videos || videos.length === 0) return null;
  const list = limit ? videos.slice(0, limit) : videos;

  return (
    <section className="mb-10">
      <SectionHeader title={title} />
      <MediaGrid>
        {list.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </MediaGrid>
    </section>
  );
}