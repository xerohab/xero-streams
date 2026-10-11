import React from "react";
import { Heart, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import DetailHero from "@/components/browse/DetailHero";
import StatusBadge from "@/components/browse/StatusBadge";

export default function CollectionHero({ franchise, titleCount, isUpdated = undefined, isFavourited, onToggleFavourite }) {
  return (
    <DetailHero image={franchise.cover_image} backdrop={franchise.backdrop_url} title={franchise.title} FallbackIcon={Layers} backTo="/" description={franchise.description}
      eyebrow={<><StatusBadge status="COLLECTION" />{isUpdated && <StatusBadge status="UPDATED" />}</>}
      meta={<><span>{titleCount} {titleCount === 1 ? "Title" : "Titles"}</span>{franchise.category && <span className="capitalize">{franchise.category}</span>}</>}>
      <Button variant={isFavourited ? "default" : "outline"} className="xero-action" onClick={onToggleFavourite}>
        <Heart className={`h-4 w-4 ${isFavourited ? "fill-current text-primary" : ""}`} />{isFavourited ? "Favourited" : "Favourite Collection"}
      </Button>
    </DetailHero>
  );
}
