import React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Link } from "react-router-dom";
import { Play, Info, Download as DownloadIcon, Plus, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/browse/StatusBadge";

/**
 * A shared compact hover overlay for Movies, TV Series, and Franchises.
 * Edge-aware, non-reflowing, accessibility-friendly.
 */
export default function MediaHoverOverlay({ children, item, type, isUpdated, isPremium, onDownload }) {
  
  const content = (
    <div className="w-[280px] sm:w-[320px] bg-card border border-border/50 rounded-xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3">
      
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-2">
          {item.title}
        </h3>
        {isUpdated && <StatusBadge status="UPDATED" className="shrink-0" />}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-medium">
        {item.release_year && <span>{item.release_year}</span>}
        {item.duration && (
           <>
             <span className="w-1 h-1 rounded-full bg-border"></span>
             <span>{item.duration}</span>
           </>
        )}
        {type === "franchise" && (
           <>
             <span className="w-1 h-1 rounded-full bg-border"></span>
             <span className="text-primary font-bold">COLLECTION</span>
           </>
        )}
        {item.is_adult && (
           <>
             <span className="w-1 h-1 rounded-full bg-border"></span>
             <span className="text-red-500 font-bold">18+</span>
           </>
        )}
        {item.quality && item.quality !== "Unknown" && (
           <>
             <span className="w-1 h-1 rounded-full bg-border"></span>
             <span className="text-primary border border-primary/30 bg-primary/10 px-1 rounded uppercase">{item.quality}</span>
           </>
        )}
      </div>

      {(item.description || item.category || item.genres) && (
        <div className="flex flex-col gap-1.5">
          {item.category && (
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
              {item.category}
            </span>
          )}
          {item.description && (
            <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/50">
        {type !== "franchise" ? (
           <Link to={type === "series" ? `/series?id=${item.id}` : `/watch?id=${item.id}`} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-bold text-xs py-2 flex items-center justify-center gap-1.5 transition-colors">
             <Play className="w-3.5 h-3.5 fill-current" /> {type === "series" ? "View" : "Play"}
           </Link>
        ) : (
           <Link to={`/franchise?id=${item.id}`} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-bold text-xs py-2 flex items-center justify-center gap-1.5 transition-colors">
             <Play className="w-3.5 h-3.5 fill-current" /> Collection
           </Link>
        )}
        
        {type !== "franchise" && (
          <Link to={type === "series" ? `/series?id=${item.id}` : `/movie?id=${item.id}`} className="w-8 h-8 rounded bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center transition-colors shrink-0">
            <Info className="w-4 h-4" />
          </Link>
        )}

        {type === "video" && onDownload && isPremium && item.video_url && (
           <button onClick={(e) => { e.preventDefault(); onDownload(item); }} className="w-8 h-8 rounded bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center transition-colors shrink-0">
             <DownloadIcon className="w-4 h-4" />
           </button>
        )}
      </div>
      
    </div>
  );

  return (
    <HoverCardPrimitive.Root openDelay={350} closeDelay={150}>
      <HoverCardPrimitive.Trigger asChild>
        {children}
      </HoverCardPrimitive.Trigger>
      {/* 
        Using Radix Portal allows it to escape hidden overflows (e.g. carousels) 
        and position itself intelligently at viewport edges.
      */}
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content 
          side="right" 
          align="start" 
          sideOffset={12} 
          collisionPadding={16}
          className="z-[100] animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          {content}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}