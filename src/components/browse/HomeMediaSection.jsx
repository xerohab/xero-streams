import React from "react";
import { Link } from "react-router-dom";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import FranchiseCard from "@/components/browse/FranchiseCard";
import SeriesCard from "@/components/browse/SeriesCard";
import VideoCard from "@/components/browse/VideoCard";
import { isRecentlyUpdated } from "@/lib/activityUtils";

export default function HomeMediaSection({ title, items, to }) {
  if (!items.length) return null;
  return (
    <section className="xero-section">
      <SectionHeader title={title} action={to && <Link to={to} className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline">View All →</Link>} />
      <MediaGrid className="xero-home-grid">{items.slice(0, 14).map((item) => {
        const isUpdated = isRecentlyUpdated(item.latestActivityAt);
        if (item.type === "franchise") return <FranchiseCard key={item.data.id} franchise={item.data} itemCount={item.items} isUpdated={isUpdated} />;
        if (item.type === "series") return <SeriesCard key={item.data.id} series={item.data} isUpdated={isUpdated} />;
        return <VideoCard key={item.data.id} video={item.data} isUpdated={isUpdated} />;
      })}</MediaGrid>
    </section>
  );
}