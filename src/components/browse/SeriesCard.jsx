import React from "react";
import { Tv } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";

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
      meta={[series.release_year, series.category && <span className="capitalize">{series.category}</span>]}
      badges={
        <>
          {isUpdated && <StatusBadge status="UPDATED" />}
          {series.is_adult && <StatusBadge status="18+" />}
        </>
      }
      popover={{ item: series, type: "series", isUpdated }}
    />
  );
}