import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Tv, Eye } from "lucide-react";

export default function SeriesCard({ series, episodeCount, from }) {
  const linkPath = from ? `/series?id=${series.id}&from=${encodeURIComponent(from)}` : `/series?id=${series.id}`;
  return (
    <Link to={linkPath}>
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
          
          {/* Views badge */}
          {(series.views || 0) > 0 && (
            <div className="absolute top-2 right-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1 z-10">
              <Eye className="w-3 h-3" />
              {series.views}
            </div>
          )}
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