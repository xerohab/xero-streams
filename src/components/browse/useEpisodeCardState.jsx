import { useState } from "react";
import { getProgress } from "@/hooks/useContinueWatching";
import { downloadSingleVideo } from "@/lib/downloadUtils";
import { isRecentlyUpdated, toActivityTimestamp } from "@/lib/activityUtils";
import toast from "react-hot-toast";

export default function useEpisodeCardState(video, { watched, playable, hrefProp }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const saved = getProgress(video?.id);
  const watchedPct = saved?.duration ? Math.min(100, Math.round(saved.currentTime / saved.duration * 100)) : 0;
  const isWatched = watched || watchedPct > 90;
  const inProgress = !!saved && !isWatched;
  const isComingSoon = playable === undefined ? video?.coming_soon || !video?.video_url : !playable;
  const href = hrefProp || `/watch?id=${video?.id}${inProgress ? `&t=${Math.floor(saved.currentTime)}` : ""}`;
  const durationLabel = typeof video?.duration === "number" ? `${Math.round(video.duration / 60)} min` : video?.duration;
  const isNew = isRecentlyUpdated(toActivityTimestamp(video?.created_date));
  const isUpdated = !isNew && isRecentlyUpdated(toActivityTimestamp(video?.content_updated_at));
  const handleClick = (e) => { if (isComingSoon) e.preventDefault(); };
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
        if (p < 100) toast.loading(`Downloading... ${p}%`, { id: toastId });
      });
      toast.success("Download complete!", { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };
  return { href, durationLabel, watchedPct, isWatched, inProgress, isComingSoon, isNew, isUpdated, handleClick, handleDownload, downloading, progress };
}