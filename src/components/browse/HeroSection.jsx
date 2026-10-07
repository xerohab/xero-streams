import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HeroContent from "@/components/browse/HeroContent";

const ROTATE_MS = 8000;

export default function HeroSection({ slides = [] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const count = slides.length;
  const index = count ? current % count : 0;

  const go = useCallback((dir) => {
    setCurrent((c) => (c + dir + count) % count);
  }, [count]);

  const goTo = useCallback((i) => {
    setCurrent(i);
  }, []);

  // Reset timer whenever slide changes or pause toggles
  useEffect(() => {
    if (paused || count <= 1 || reducedMotion.current) return;
    timerRef.current = setTimeout(() => setCurrent((c) => (c + 1) % count), ROTATE_MS);
    return () => clearTimeout(timerRef.current);
  }, [current, paused, count]);

  // Pause when tab hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!count) return null;
  const slide = slides[index];

  return (
    <header
      className="home-hero"
      aria-label="Featured titles"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const backdrop = s.type === "franchise" ? (s.data.backdrop_url || s.data.cover_image)
          : s.type === "series" ? (s.data.backdrop_url || s.data.cover_image)
          : (s.data.backdrop_url || s.data.thumbnail_url);
        return (
          <img
            key={s.data.id}
            src={backdrop}
            alt=""
            aria-hidden="true"
            fetchPriority={i === 0 ? "high" : "low"}
            className="home-hero-artwork"
            style={{ opacity: i === index ? 1 : 0, transition: reducedMotion.current ? "none" : "opacity 600ms ease-in-out" }}
          />
        );
      })}
      <div className="home-hero-shade" />
      <div className="home-hero-left" />
      <div className="home-hero-bottom" />
      <div className="home-container home-hero-inner">
        <HeroContent slide={slide} active={index === current} reducedMotion={reducedMotion.current} />
      </div>
      {count > 1 && (
        <div className="home-hero-pagination">
          <div className="flex gap-2" role="tablist" aria-label="Slide indicators">
            {slides.map((s, i) => (
              <button
                key={s.data.id}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={i === index}
                aria-label={`Show ${s.data.title}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-4 bg-foreground/30 hover:bg-foreground/50"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => go(-1)} aria-label="Previous featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => go(1)} aria-label="Next featured title" className="rounded-lg border border-border bg-background/70 p-2 text-foreground hover:border-primary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}