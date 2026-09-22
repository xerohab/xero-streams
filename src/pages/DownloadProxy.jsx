import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, AlertCircle, FileArchive } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function DownloadProxy() {
  const { type, id } = useParams(); // type can be 'video', 'series', 'franchise'
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [status, setStatus] = useState("Checking permissions...");
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError("You must be logged in to download content.");
      return;
    }

    checkAndDownload();
  }, [user, isLoadingAuth, type, id]);

  const logDownload = async (params) => {
    try {
      await base44.entities.DownloadLog.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        ...params,
      });
    } catch {
      // logging is best-effort
    }
  };

  const checkAndDownload = async () => {
    try {
      // Check subscription
      const subscriptions = await base44.entities.UserSubscription.filter({
        user_id: user.id,
        status: "active",
      });

      const isSubscribed = user.role === "admin" || subscriptions.length > 0;

      if (!isSubscribed) {
        setError("Downloads are only available for premium subscribers.");
        return;
      }

      setStatus("Preparing download...");

      if (type === "video") {
        const [video] = await base44.entities.Video.filter({ id });
        if (!video || !video.video_url) {
          setError("Video file not found.");
          return;
        }

        // Log the single download
        await logDownload({
          content_type: video.content_type === "episode" ? "episode" : "movie",
          content_id: id,
          content_title: video.title,
          download_type: "single",
          item_count: 1,
        });

        setStatus("Redirecting...");
        window.location.replace(video.video_url);
      } else if (type === "series" || type === "franchise") {
        // Fetch the series/franchise title for the ZIP filename
        let title = type === "series" ? "Series" : "Franchise";
        if (type === "series") {
          const [series] = await base44.entities.Series.filter({ id });
          if (series) title = series.title;
        } else {
          const [franchise] = await base44.entities.Franchise.filter({ id });
          if (franchise) title = franchise.title;
        }

        setStatus(`Bundling ${title} into a ZIP file...`);
        setProgress("Fetching and compressing episodes — this may take a moment...");

        const res = await base44.functions.invoke("downloadSeriesZip", {
          type,
          id,
          title,
        });

        if (res.data?.error) {
          setError(res.data.error);
          return;
        }

        if (!res.data?.signed_url) {
          setError("Failed to generate download link.");
          return;
        }

        setStatus("Your ZIP is ready! Starting download...");
        // Trigger the download
        const a = document.createElement("a");
        a.href = res.data.signed_url;
        a.download = res.data.filename || `${title}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          setStatus(`Download started! ${res.data.item_count} episode(s) bundled in your ZIP file.`);
        }, 1500);
      } else {
        setError("Invalid download type.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while preparing your download.");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Download Failed</h1>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {type === "series" || type === "franchise" ? (
        <FileArchive className="w-12 h-12 text-primary mb-4 animate-pulse" />
      ) : (
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      )}
      <h1 className="text-2xl font-bold mb-2">Please wait</h1>
      <p className="text-muted-foreground">{status}</p>
      {progress && <p className="text-muted-foreground/70 text-sm mt-2">{progress}</p>}
    </div>
  );
}