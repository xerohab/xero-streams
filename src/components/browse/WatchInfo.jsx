import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/browse/StatusBadge";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function WatchInfo({ video, series }) {
  const updated = isRecentlyUpdated(toActivityTimestamp(video.content_updated_at));
  return (
    <section className="max-w-4xl py-7 md:py-9">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {series ? <Link to={`/series?id=${series.id}`} className="text-xs font-bold uppercase tracking-widest text-primary">{series.title}{video.episode_number > 0 && ` · Episode ${video.episode_number}`}</Link> : <StatusBadge status="Movie" />}
        {updated && <StatusBadge status="UPDATED" />}
        {(video.coming_soon || !video.video_url) && <StatusBadge status="Coming Soon" />}
      </div>
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">{video.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {video.release_year && <span>{video.release_year}</span>}
        {video.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{video.duration}</span>}
        {series?.category && <span className="capitalize">{series.category}</span>}
        {video.quality && video.quality !== "Unknown" && <StatusBadge status={video.quality} />}
        {video.quality_notes && <span>{video.quality_notes}</span>}
        {video.release_date && <span>{format(new Date(video.release_date), "d MMM yyyy")}</span>}
      </div>
      {video.description && <p className="mt-5 max-w-3xl text-sm leading-relaxed text-foreground/70 md:text-base">{video.description}</p>}
    </section>
  );
}