import React from "react";
import VideoCard from "./VideoCard";

export default function VideoRow({ title, videos }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10 px-4 md:px-12 lg:px-16">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-start">
        {videos.map((video, i) => (
          <VideoCard key={video.id} video={video} index={i} />
        ))}
      </div>
    </div>
  );
}