import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Play, X, Clock } from "lucide-react";
import { getAll, removeProgress } from "@/hooks/useContinueWatching";

export default function ContinueWatchingRow({ isAdult = false }) {
  const [items, setItems] = useState(() => {
    const all = getAll();
    return all.filter(item => item.is_adult === isAdult);
  });

  if (items.length === 0) return null;

  const handleRemove = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    removeProgress(id);
    setItems(getAll().filter(item => item.is_adult === isAdult));
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" /> Continue Watching
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-4 justify-center">
        {items.map((item) => (
          <Link key={item.id} to={`/watch?id=${item.id}&t=${Math.floor(item.currentTime)}`} className="group relative">
            <div className="relative aspect-video rounded-md overflow-hidden bg-secondary">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
                </div>
              </div>
              {/* Remove button */}
              <button
                onClick={(e) => handleRemove(e, item.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="mt-1.5 px-0.5">
              <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{formatTime(item.currentTime)} / {formatTime(item.duration)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}