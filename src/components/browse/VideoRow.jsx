import React from "react";
import VideoCard from "./VideoCard";

export default function VideoRow({ title, videos }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10 px-6 md:px-16">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {videos.map((video, i) => (
          <VideoCard key={video.id} video={video} index={i} />
        ))}
      </div>
    </div>
  );
}