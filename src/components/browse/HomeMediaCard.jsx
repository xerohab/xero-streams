import React from "react";
import { Film, Layers, Play, Tv } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function HomeMediaCard({ item }) {
  const { data, type } = item;
  const collection = type === "franchise";
  const series = type === "series";
  const episode = !collection && !series && (data.content_type === "episode" || !!data.series_id);
  const updated = isRecentlyUpdated(item.latestActivityAt);
  const fresh = !collection && isRecentlyUpdated(toActivityTimestamp(data.created_date));
  const href = collection ? `/franchise?id=${data.id}` : series ? `/series?id=${data.id}` : episode ? `/watch?id=${data.id}` : `/movie?id=${data.id}`;
  const year = data.release_year || (data.release_date ? new Date(data.release_date).getFullYear() : null);
  const metadata = collection ? [`${item.items} ${item.items === 1 ? "Title" : "Titles"}`, data.category] : [year || (series ? "TV Series" : episode ? "Episode" : "Movie"), data.duration || data.category];
  return (
    <MediaCard
      to={href}
      image={data.cover_image || data.thumbnail_url}
      title={data.title}
      FallbackIcon={collection ? Layers : series ? Tv : Film}
      HoverIcon={collection ? Layers : series ? Tv : Play}
      meta={metadata}
      className="home-media-card"
      badges={<>{updated && <StatusBadge status={fresh ? "NEW" : "UPDATED"} />}{collection && <StatusBadge status="COLLECTION" />}{!collection && !series && (data.coming_soon || !data.video_url) && <StatusBadge status="Coming Soon" />}</>}
      popover={{ item: data, type, isUpdated: updated, cinema: true, itemCount: item.items }}
    />
  );
}