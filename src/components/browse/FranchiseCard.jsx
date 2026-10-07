import React from "react";
import { Link } from "react-router-dom";
import { Layers, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FranchiseCard({ franchise, itemCount, itemLabel }) {
  return (
    <Link 
      to={`/franchise?id=${franchise.id}`} 
      className="group relative flex flex-col gap-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 bg-card border border-transparent hover:border-border/50 max-w-[180px] w-full mx-auto"
    >
      <div className="relative aspect-[2/3] w-full bg-secondary/30 rounded-xl overflow-hidden shadow-inner">
        {franchise.cover_image ? (
          <img
            src={franchise.cover_image}
            alt={franchise.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Layers className="w-10 h-10 opacity-30" />
          </div>
        )}
        
        {/* Dark overlay that appears on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
             <button className="w-full bg-primary text-primary-foreground font-bold text-sm py-2 rounded-full mb-2 flex items-center justify-center gap-2">
               <Layers className="w-4 h-4" /> View Collection
             </button>
          </div>
        </div>

        {/* Persistent top badges */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-none text-[10px] uppercase font-bold tracking-wider shadow-lg">
            Collection
          </Badge>
        </div>
        
        {(franchise.views || 0) > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded flex items-center gap-1 z-10 font-bold">
            <Eye className="w-3 h-3" />
            {franchise.views}
          </div>
        )}
      </div>
      
      <div className="px-1 py-1">
        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {franchise.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
          {itemCount > 0 ? <span>{itemCount} {itemLabel || "Titles"}</span> : null}
        </div>
      </div>
    </Link>
  );
}