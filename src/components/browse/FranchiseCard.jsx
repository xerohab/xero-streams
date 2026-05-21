import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, Eye } from "lucide-react";

export default function FranchiseCard({ franchise, itemCount, itemLabel }) {
  return (
    <Link to={`/franchise?id=${franchise.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1"
      >
        <div className="aspect-video relative overflow-hidden bg-secondary w-full">
          {franchise.cover_image ? (
            <img
              src={franchise.cover_image}
              alt={franchise.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-white font-bold text-sm leading-tight line-clamp-2">{franchise.title}</p>
          </div>
          
          {/* Views badge */}
          {(franchise.views || 0) > 0 && (
            <div className="absolute top-2 right-2 bg-black/80 text-xs text-white px-2 py-0.5 rounded flex items-center gap-1 z-10">
              <Eye className="w-3 h-3" />
              {franchise.views}
            </div>
          )}
        </div>
        <div className="p-2">
          {itemCount > 0 && (
            <p className="text-xs text-muted-foreground">{itemCount} {itemLabel || "Titles"}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}