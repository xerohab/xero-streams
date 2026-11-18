import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HomeSectionHeader from "@/components/browse/HomeSectionHeader";
import HomeMediaCard from "@/components/browse/HomeMediaCard";

export default function HomeMediaSection({ title, items, to, id, limit = 16 }) {
  const visible = items.slice(0, limit);
  const track = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const sync = () => setEdges({ left: node.scrollLeft > 2, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 });
    sync();
    node.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => { node.removeEventListener("scroll", sync); observer.disconnect(); };
  }, [visible.length]);
  const move = (direction) => {
    const node = track.current;
    if (!node) return;
    const first = node.firstElementChild;
    const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
    const step = first ? first.getBoundingClientRect().width + gap : node.clientWidth;
    const count = Math.max(1, Math.round((node.clientWidth + gap) / step));
    node.scrollBy({ left: direction * count * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  if (!visible.length) return null;
  return (
    <section className="home-section home-carousel-section" id={id} data-home-count={visible.length}>
      <div className="home-carousel-heading">
        <HomeSectionHeader title={title} to={to} />
        {(edges.left || edges.right) && <div className="home-carousel-controls">
          <button type="button" aria-label={`Previous ${title}`} aria-controls={`${id}-track`} disabled={!edges.left} onClick={() => move(-1)}><ChevronLeft size={17} /></button>
          <button type="button" aria-label={`Next ${title}`} aria-controls={`${id}-track`} disabled={!edges.right} onClick={() => move(1)}><ChevronRight size={17} /></button>
        </div>}
      </div>
      <div className="home-carousel-track" id={`${id}-track`} ref={track} tabIndex={0} role="region" aria-label={title}>
        {visible.map((item) => <div className="home-carousel-slide" key={`${item.type}-${item.data.id}`}><HomeMediaCard item={item} /></div>)}
      </div>
    </section>
  );
}
