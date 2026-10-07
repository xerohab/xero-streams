import React from "react";
import { Layers } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";

export default function FranchiseCard({ franchise, itemCount, isUpdated }) {
  const countLabel = itemCount != null ? `${itemCount} ${itemCount === 1 ? "Title" : "Titles"}` : "Collection";

  return (
    <MediaCard
      to={`/franchise?id=${franchise.id}`}
      image={franchise.cover_image}
      alt={franchise.title}
      title={franchise.title}
      FallbackIcon={Layers}
      HoverIcon={Layers}
      meta={[countLabel, franchise.category && <span className="capitalize">{franchise.category}</span>]}
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