import React from "react";
import { useNavigate } from "react-router-dom";
import { Film, Play } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";
import CardGenres from "@/components/browse/CardGenres";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function VideoCard({ video, isUpdated  = undefined}) {
  const navigate = useNavigate();

  if (!video) return null;
  const isComingSoon = video.coming_soon || !video.video_url;
  const href = video.series_id ? `/watch?id=${video.id}` : `/movie?id=${video.id}`;

  const handleClick = (e) => {
    e.preventDefault();
    if (isComingSoon && video.content_type === "movie") navigate(`/movie?id=${video.id}`);
    else navigate(href);
  };

  const year = video.release_year || (video.release_date ? new Date(video.release_date).getFullYear() : null);

  return (
    <MediaCard
      to={href}
      onClick={handleClick}
      image={video.thumbnail_url}
      alt={video.title}
      title={video.title}
      FallbackIcon={Film}
      HoverIcon={Play}
      meta={[year, video.duration, <CardGenres key="g" record={video} max={2} />]}
      badges={
        <>
          {isUpdated && <StatusBadge status={isRecentlyUpdated(toActivityTimestamp(video.created_date)) ? "NEW" : "UPDATED"} />}
          {video.episode_number && video.content_type === "episode" && <StatusBadge status={`Ep ${video.episode_number}`} />}
          {isComingSoon && <StatusBadge status="Coming Soon" />}
        </>
      }
      popover={{ item: video, type: "video", isUpdated }}
    />
  );
}
