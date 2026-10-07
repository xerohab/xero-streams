import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Download as DownloadIcon, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProgress } from "@/hooks/useContinueWatching";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import toast from "react-hot-toast";

export default function EpisodeCard({ video, isPremium }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!video) return null;
  const isComingSoon = video.coming_soon || !video.video_url;
  const href = `/watch?id=${video.id}`;
  
  const savedProgress = getProgress(video.id);
  const watchedPct = savedProgress ? Math.min(100, Math.round((savedProgress.currentTime / savedProgress.duration) * 100)) : 0;
  const isWatched = watchedPct > 90;

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setProgress(0);
    const toastId = toast.loading(`Preparing download for ${video.title}...`);
    try {
      await downloadSingleVideo(video.id, (p) => {
         setProgress(p);
         if (p < 100) {
            toast.loading(`Downloading... ${p}%`, { id: toastId });
         }
      });
      toast.success("Download complete!", { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (!isComingSoon) navigate(href);
  };

  return (
    <Link 
      to={href} 
      onClick={handleClick} 
      className="group relative flex flex-col gap-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 bg-card border border-transparent hover:border-border/50 max-w-[280px] w-full mx-auto"
    >
      <div className="relative aspect-video w-full bg-secondary/30 overflow-hidden shadow-inner rounded-xl">
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title}
            loading="lazy" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/20">
            <Play className="w-8 h-8 opacity-20" />
          </div>
        )}
        
        {/* Dark overlay that appears on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
           <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
             <Play className="w-5 h-5 fill-current ml-1" />
           </div>
           {isPremium && !isComingSoon && video.video_url && (
             <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 backdrop-blur-md"
             >
                {downloading ? <span className="text-xs font-bold">{progress}%</span> : <DownloadIcon className="w-5 h-5" />}
             </button>
           )}
        </div>

        {/* Persistent top badges */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {video.episode_number && (
            <Badge variant="secondary" className="bg-black/80 backdrop-blur-md text-white border-none text-[10px] sm:text-xs uppercase font-bold tracking-wider px-2 py-0.5">
              EP {video.episode_number}
            </Badge>
          )}
          {isComingSoon && (
            <Badge variant="destructive" className="bg-amber-500/90 text-amber-950 border-none font-bold text-[10px] uppercase shadow-lg">
              Coming Soon
            </Badge>
          )}
        </div>

        {isWatched && (
          <div className="absolute top-2 right-2">
            <CheckCircle className="w-5 h-5 text-primary drop-shadow-md" />
          </div>
        )}

        {/* Progress bar */}
        {savedProgress && !isWatched && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-primary" style={{ width: `${watchedPct}%` }}></div>
          </div>
        )}
      </div>
      
      <div className="px-2 pb-2">
        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        {video.duration && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{video.duration}</span>
          </div>
        )}
      </div>
    </Link>
  );
}