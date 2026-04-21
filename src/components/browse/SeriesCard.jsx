import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Tv } from "lucide-react";

export default function SeriesCard({ series, episodeCount }) {
  return (
    <Link to={`/series?id=${series.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1"
      >
        {/* Thumbnail */}
        <div className="aspect-video relative overflow-hidden bg-secondary w-full">
          {series.cover_image ? (
            <img
              src={series.cover_image}
              alt={series.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tv className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
        </div>

        {/* Info */}
        <div className="p-2">
          <p className="text-sm font-semibold text-foreground truncate">{series.title}</p>
          {episodeCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{episodeCount} episode{episodeCount !== 1 ? "s" : ""}</p>
          )}
          {series.category && (
            <p className="text-xs text-primary mt-0.5 capitalize">{series.category}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}