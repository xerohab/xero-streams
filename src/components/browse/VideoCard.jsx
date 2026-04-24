import React, { useState } from "react";
import { Play, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function VideoCard({ video, index, from }) {
  const [isHovered, setIsHovered] = useState(false);

  const linkPath = from ? `/watch?id=${video.id}&from=${encodeURIComponent(from)}` : `/watch?id=${video.id}`;

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={linkPath}>
        <div className="relative aspect-video rounded-md overflow-hidden bg-secondary transition-shadow duration-300 hover:shadow-lg hover:shadow-black/40 w-full">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Hover overlay */}
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          )}

          {/* Episode number */}
          {video.episode_number && (
            <div className="absolute top-2 left-2 bg-primary/90 text-xs text-primary-foreground font-bold px-2 py-0.5 rounded">
              EP {video.episode_number}
            </div>
          )}
        </div>

        {/* Title only — no description, no overlap */}
        <div className="mt-2 px-1 pb-1 min-h-[2.5rem]">
          <h3 className="text-xs md:text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors break-words line-clamp-3">
            {video.title}
          </h3>
        </div>
      </Link>
    </div>
  );
}