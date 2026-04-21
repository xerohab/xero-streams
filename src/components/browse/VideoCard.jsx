import React, { useState } from "react";
import { Play, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function VideoCard({ video, index }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="flex-shrink-0 w-[160px] md:w-[240px] lg:w-[280px] group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/watch?id=${video.id}`}>
        <div className="relative aspect-video rounded-md overflow-hidden bg-secondary transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:z-10">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Hover overlay */}
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          )}

          {/* Episode number */}
          {video.episode_number && (
            <div className="absolute top-2 left-2 bg-primary/90 text-xs text-primary-foreground font-bold px-2 py-0.5 rounded">
              EP {video.episode_number}
            </div>
          )}
        </div>

        <div className="mt-2 px-1">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {video.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}