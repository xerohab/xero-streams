import React from "react";
import HomeSectionHeader from "@/components/browse/HomeSectionHeader";
import HomeMediaCard from "@/components/browse/HomeMediaCard";

export default function HomeMediaSection({ title, items, to, id }) {
  const visible = items.slice(0, 14);
  if (!visible.length) return null;
  return (
    <section className="home-section" id={id} data-home-count={visible.length}>
      <HomeSectionHeader title={title} to={to} />
      <div className="home-poster-grid">
        {visible.map((item) => <HomeMediaCard key={item.data.id} item={item} />)}
      </div>
    </section>
  );
}