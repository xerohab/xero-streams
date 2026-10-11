import React from "react";
import { Layers } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";
import CardGenres from "@/components/browse/CardGenres";

export default function FranchiseCard({ franchise, itemCount = undefined, itemLabel = undefined, isUpdated  = undefined}) {
  const countLabel = itemCount != null ? `${itemCount} ${itemLabel || (itemCount === 1 ? "Title" : "Titles")}` : "Collection";

  return (
    <MediaCard
      to={`/franchise?id=${franchise.id}`}
      image={franchise.cover_image}
      alt={franchise.title}
      title={franchise.title}
      FallbackIcon={Layers}
      HoverIcon={Layers}
      meta={[countLabel, <CardGenres key="g" record={franchise} legacyField="category" max={2} />]}
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
