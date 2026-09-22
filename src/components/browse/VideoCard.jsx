import React, { useState } from "react";
import { Play, Clock, CalendarClock, Eye, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useDownloadManager } from "@/lib/DownloadManagerContext";

export default function VideoCard({ video, index, from, isAdult, onDownload }) {
  const [isHovered, setIsHovered] = useState(false);
  const { startDownload } = useDownloadManager();

  // A video is "coming soon" if flagged OR if it has no playable URL
  const isComingSoon = video.coming_soon || !video.video_url;

  const linkPath = isComingSoon
    ? `/movie?id=${video.id}`
    : from ? `/watch?id=${video.id}&from=${encodeURIComponent(from)}` : `/watch?id=${video.id}`;

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
              className={`w-full h-full object-cover ${isComingSoon ? "brightness-50" : ""}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <CalendarClock className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Coming Soon overlay */}
          {isComingSoon ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <CalendarClock className="w-7 h-7 text-white" />
              <span className="text-white text-xs font-bold tracking-wider uppercase">Coming Soon</span>
              {video.release_date && (
                <span className="text-white/70 text-xs mt-0.5">
                  {format(new Date(video.release_date), "d MMM yyyy")}
                </span>
              )}
            </div>
          ) : (
            /* Hover overlay — only when not coming soon */
            <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
                </div>
                {onDownload && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startDownload(video);
                    }}
                    className="w-10 h-10 rounded-full bg-green-600/90 hover:bg-green-500 flex items-center justify-center backdrop-blur-sm transition-colors"
                    title="Download this episode"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Duration badge */}
          {!isComingSoon && video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          )}

          {/* Views badge */}
          {!isComingSoon && (video.views || 0) > 0 && (
            <div className="absolute bottom-2 left-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1 z-10">
              <Eye className="w-3 h-3" />
              {video.views}
            </div>
          )}

          {/* Episode number - only for non-adult content */}
          {!isAdult && video.episode_number && (
            <div className="absolute top-2 left-2 bg-primary/90 text-xs text-primary-foreground font-bold px-2 py-0.5 rounded">
              EP {video.episode_number}
            </div>
          )}

          {/* Quality badge */}
          {!isComingSoon && ((video.quality && video.quality !== "Unknown") || video.quality_notes) && (
            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] uppercase text-white font-bold px-1.5 py-0.5 rounded tracking-wide flex flex-col items-end gap-0.5">
              {video.quality && video.quality !== "Unknown" && <span>{video.quality}</span>}
              {video.quality_notes && <span className="text-[9px] text-muted-foreground capitalize">{video.quality_notes}</span>}
            </div>
          )}

          {/* Coming Soon badge top-right */}
          {isComingSoon && (
            <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded">
              Soon
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