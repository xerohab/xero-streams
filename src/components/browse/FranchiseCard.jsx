import React from "react";
import { Eye, Layers } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";

export default function FranchiseCard({ franchise, itemCount, itemLabel, isUpdated }) {
  const countLabel =
    itemCount > 0
      ? `${itemCount} ${itemCount === 1 ? (itemLabel ? itemLabel.replace(/s$/, "") : "Title") : itemLabel || "Titles"}`
      : null;
  const views = franchise.views || 0;

  return (
    <MediaCard
      to={`/franchise?id=${franchise.id}`}
      image={franchise.cover_image}
      alt={franchise.title}
      title={franchise.title}
      FallbackIcon={Layers}
      HoverIcon={Layers}
      meta={[
        countLabel,
        views > 0 && (
          <>
            <Eye className="h-3 w-3" />
            {views}
          </>
        ),
      ]}
      badges={
        <>
          {isUpdated && <StatusBadge status="UPDATED" />}
          <StatusBadge status="COLLECTION" />
        </>
      }
      popover={{ item: franchise, type: "franchise", isUpdated }}
    />
  );
}