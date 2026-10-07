import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Film, Eye, Heart, Download } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function VideoCard({ video }) {
  const navigate = useNavigate();

  if (!video) return null;
  const isComingSoon = video.coming_soon || !video.video_url;
  const href = video.series_id ? `/watch?id=${video.id}` : `/movie?id=${video.id}`;

  const handleClick = (e) => {
    e.preventDefault();
    if (isComingSoon && video.content_type === "movie") navigate(`/movie?id=${video.id}`);
    else navigate(href);
  };

  return (
    <Link 
      to={href} 
      onClick={handleClick} 
      className="group relative flex flex-col gap-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 bg-card border border-transparent hover:border-border/50 max-w-[180px] w-full mx-auto"
    >
      <div className="relative aspect-[2/3] w-full bg-secondary/30 rounded-xl overflow-hidden shadow-inner">
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title}
            loading="lazy" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Film className="w-10 h-10 opacity-30" />
          </div>
        )}
        
        {/* Dark overlay that appears on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
             <button className="w-full bg-primary text-primary-foreground font-bold text-sm py-2 rounded-full mb-2 flex items-center justify-center gap-2">
               <PlayIcon className="w-4 h-4 fill-current" /> Play
             </button>
             {video.quality && video.quality !== "Unknown" && (
                <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded border border-primary/30 uppercase">{video.quality}</span>
             )}
          </div>
        </div>

        {/* Persistent top badges */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {video.episode_number && (
            <Badge variant="secondary" className="bg-black/70 backdrop-blur-sm text-white border-none text-[10px] uppercase font-bold tracking-wider">
              Ep {video.episode_number}
            </Badge>
          )}
          {isComingSoon && (
            <Badge variant="destructive" className="bg-amber-500/90 text-amber-950 border-none font-bold text-[10px] uppercase shadow-lg">
              Coming Soon
            </Badge>
          )}
        </div>
      </div>
      
      <div className="px-1 py-1">
        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
          {video.release_year ? <span>{video.release_year}</span> : (video.release_date && <span>{new Date(video.release_date).getFullYear()}</span>)}
          {video.duration && (
            <>
              <span className="w-1 h-1 rounded-full bg-border"></span>
              <span>{video.duration}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function PlayIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}