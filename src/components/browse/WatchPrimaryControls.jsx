import React, { useState } from "react";
import { Heart, SkipBack, SkipForward, Info, Download, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import WatchlistButton from "@/components/browse/WatchlistButton";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import toast from "react-hot-toast";

export default function WatchPrimaryControls({ video, series, isComingSoon, isPremium, isPurchased, isFavourited, onFavourite, prevVideo, nextVideo, prevLabel, nextLabel, onNavigate, onPurchase, purchasing }) {
  const [progress, setProgress] = useState(null);
  const download = async () => {
    setProgress(0);
    try { await downloadSingleVideo(video.id, setProgress); }
    catch (err) { toast.error(err.message); }
    finally { setProgress(null); }
  };
  const ownedDownload = () => {
    const a = document.createElement("a"); a.href = video.download_url; a.download = "";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border py-5">
      {prevVideo && <Button variant="secondary" className="xero-action" onClick={() => onNavigate(`/watch?id=${prevVideo.id}`)}><SkipBack />{prevLabel}</Button>}
      {nextVideo && <Button className="h-11 gap-2 rounded-lg font-bold" onClick={() => onNavigate(`/watch?id=${nextVideo.id}`)}><SkipForward />{nextLabel}</Button>}
      <WatchlistButton videoId={video.id} className="xero-action" label="My List" />
      {!isComingSoon && <Button variant="outline" className="xero-action" onClick={onFavourite}><Heart className={isFavourited ? "fill-current text-primary" : ""} />{isFavourited ? "Favourited" : "Favourite"}</Button>}
      <Button variant="outline" className="xero-action" onClick={() => onNavigate(series ? `/series?id=${series.id}` : `/movie?id=${video.id}`)}><Info />More Info</Button>
      {video.is_for_sale && (isPurchased ? <Button variant="outline" className="xero-action text-primary" onClick={ownedDownload}><Download />Download</Button> : <Button className="h-11 gap-2 rounded-lg" onClick={onPurchase} disabled={purchasing}>{purchasing ? <Loader2 className="animate-spin" /> : <ShoppingCart />}Buy to Download (${video.price})</Button>)}
      {!video.is_for_sale && isPremium && !isComingSoon && <Button variant="outline" className="xero-action text-primary" onClick={download} disabled={progress !== null}>{progress !== null ? <Loader2 className="animate-spin" /> : <Download />}{progress !== null ? `Downloading ${progress}%` : "Download"}</Button>}
    </div>
  );
}