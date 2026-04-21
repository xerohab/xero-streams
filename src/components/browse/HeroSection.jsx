import React, { useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroSection({ videos = [], seriesList = [] }) {
  const [current, setCurrent] = useState(0);

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % videos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [videos.length]);

  if (!videos.length) return null;

  const video = videos[current];
  const seriesTitle = video.series_id
    ? seriesList.find((s) => s.id === video.series_id)?.title
    : null;

  const prev = () => setCurrent((c) => (c - 1 + videos.length) % videos.length);
  const next = () => setCurrent((c) => (c + 1) % videos.length);

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={video.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 pb-20 md:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={video.id + "-content"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            {seriesTitle && (
              <p className="text-sm md:text-base font-semibold text-primary tracking-widest uppercase mb-2">
                {seriesTitle}
              </p>
            )}
            <h1 className="text-3xl md:text-6xl font-black leading-tight mb-3 md:mb-4 text-foreground">
              {video.title}
            </h1>
            {video.description && (
              <p className="text-sm md:text-lg text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                {video.description}
              </p>
            )}
            <Link to={`/watch?id=${video.id}`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-6 md:px-8 text-base md:text-lg rounded-md">
                <Play className="w-5 h-5 fill-current" />
                Play
              </Button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {videos.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all z-20">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all z-20">
            <ChevronRight className="w-6 h-6" />
          </button>
          {/* Dots */}
          <div className="absolute bottom-6 right-6 md:right-16 flex gap-2 z-20">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-primary w-6" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}