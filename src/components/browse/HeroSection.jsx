import React from "react";
import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function HeroSection({ video, seriesTitle }) {
  if (!video) return null;

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-background" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 pb-20 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
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
          <div className="flex items-center gap-3">
            <Link to={`/watch?id=${video.id}`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-6 md:px-8 text-base md:text-lg rounded-md">
                <Play className="w-5 h-5 fill-current" />
                Play
              </Button>
            </Link>
            <Link to={`/watch?id=${video.id}`}>
              <Button size="lg" variant="secondary" className="bg-secondary/80 hover:bg-secondary text-secondary-foreground font-semibold gap-2 px-6 md:px-8 text-base md:text-lg rounded-md backdrop-blur-sm">
                <Info className="w-5 h-5" />
                More Info
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}