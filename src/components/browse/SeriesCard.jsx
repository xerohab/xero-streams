import React from "react";
import { Link } from "react-router-dom";
import { Tv, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SeriesCard({ series, isUpdated }) {
  if (!series) return null;

  return (
    <Link 
      to={`/series?id=${series.id}`} 
      className="group relative flex flex-col gap-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 bg-card border border-transparent hover:border-border/50 max-w-[180px] w-full mx-auto"
    >
      <div className="relative aspect-[2/3] w-full bg-secondary/30 rounded-xl overflow-hidden shadow-inner">
        {series.cover_image ? (
          <img 
            src={series.cover_image} 
            alt={series.title} 
            loading="lazy" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Tv className="w-10 h-10 opacity-30" />
          </div>
        )}
        
        {/* Dark overlay that appears on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
             <button className="w-full bg-primary text-primary-foreground font-bold text-sm py-2 rounded-full mb-2 flex items-center justify-center gap-2">
               <Tv className="w-4 h-4" /> View Series
             </button>
             {series.category && (
                <span className="text-xs font-bold text-muted-foreground capitalize bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">{series.category}</span>
             )}
          </div>
        </div>

        {/* Persistent top badges */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
          {isUpdated && (
            <Badge className="bg-green-600/90 hover:bg-green-600/90 text-white border-none text-[10px] uppercase font-bold tracking-wider shadow-lg">
              Updated
            </Badge>
          )}
          {series.is_adult && (
            <Badge variant="destructive" className="bg-red-600/90 text-white border-none font-bold text-[10px] tracking-widest shadow-lg">
              18+
            </Badge>
          )}
        </div>
      </div>
      
      <div className="px-1 py-1">
        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {series.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
          {series.release_year && <span>{series.release_year}</span>}
          {series.category && (
            <>
              {series.release_year && <span className="w-1 h-1 rounded-full bg-border"></span>}
              <span className="capitalize">{series.category}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}