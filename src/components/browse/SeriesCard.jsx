import React from "react";
import { Tv } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";
import CardGenres from "@/components/browse/CardGenres";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";

export default function SeriesCard({ series, isUpdated }) {
  if (!series) return null;

  return (
    <MediaCard
      to={`/series?id=${series.id}`}
      image={series.cover_image}
      alt={series.title}
      title={series.title}
      FallbackIcon={Tv}
      HoverIcon={Tv}
      meta={[series.release_year, <CardGenres key="g" record={series} legacyField="category" max={2} />]}
      badges={
        <>
          {isUpdated && <StatusBadge status={isRecentlyUpdated(toActivityTimestamp(series.created_date)) ? "NEW" : "UPDATED"} />}
          {series.is_adult && <StatusBadge status="18+" />}
        </>
      }
      popover={{ item: series, type: "series", isUpdated }}
    />
  );
}