import React from "react";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import { isRecentlyUpdated } from "@/lib/activityUtils";

/** Renders one catalogue group (collection, series or movie) with the shared poster card. */
export default function BrowseItemCard({ item }) {
  const isUpdated = isRecentlyUpdated(item.latestActivityAt);
  if (item.type === "franchise") return <FranchiseCard franchise={item.data} itemCount={item.items} isUpdated={isUpdated} />;
  if (item.type === "series") return <SeriesCard series={item.data} isUpdated={isUpdated} />;
  return <VideoCard video={item.data} isUpdated={isUpdated} />;
}