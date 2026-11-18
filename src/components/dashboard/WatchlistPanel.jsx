import React,{useState} from "react";
import {base44} from "@/api/base44Client";
import { ListVideo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MediaGrid from "@/components/browse/MediaGrid";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import EpisodeCard from "@/components/browse/EpisodeCard";

export default function WatchlistPanel({ watchlist, items, videos, allSeries, isPremium, onDelete }) {
  const [shareStatus,setShareStatus]=useState("");
  const share=async()=>{try{const r=await base44.functions.invoke("shareWatchlist",{id:watchlist.id});if(r.data?.error)throw Error(r.data.error);const value=[r.data.name,...r.data.links.map(v=>v.title+" — "+v.url)].join("\\n").replaceAll("\\n","\n");await navigator.clipboard.writeText(value);setShareStatus("Watchlist copied");}catch{setShareStatus("Unable to copy watchlist");}};
  const media = items.map((item) => item.series_id ? { type: "series", data: allSeries.find((s) => s.id === item.series_id) } : { type: "video", data: videos.find((v) => v.id === item.video_id) }).filter((item) => item.data);
  const posters = media.filter((item) => item.type === "series" || !item.data.series_id);
  const episodes = media.filter((item) => item.type === "video" && item.data.series_id);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-bold"><ListVideo className="h-4 w-4 text-primary" />{watchlist.name}</h3><div className="flex items-center gap-2"><button className="text-primary text-xs" onClick={share}>Share list</button><Button variant="ghost" size="icon" aria-label={`Delete ${watchlist.name}`} onClick={() => onDelete(watchlist.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></div>
      <div className="space-y-4 p-4">{shareStatus&&<p role="status">{shareStatus}</p>}
        {!media.length && <p className="text-sm text-muted-foreground">No items in this watchlist yet.</p>}
        {!!posters.length && <MediaGrid>{posters.map((item) => item.type === "series" ? <SeriesCard key={item.data.id} series={item.data} /> : <VideoCard key={item.data.id} video={item.data} />)}</MediaGrid>}
        {!!episodes.length && <EpisodeGrid>{episodes.map((item) => <EpisodeCard key={item.data.id} video={item.data} isPremium={isPremium} />)}</EpisodeGrid>}
      </div>
    </div>
  );
}