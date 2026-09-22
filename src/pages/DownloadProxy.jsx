import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function DownloadProxy() {
  const { type, id } = useParams(); // type can be 'video', 'series', 'franchise'
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [status, setStatus] = useState("Checking permissions...");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError("You must be logged in to download content.");
      return;
    }

    checkAndDownload();
  }, [user, isLoadingAuth, type, id]);

  const checkAndDownload = async () => {
    try {
      // Check subscription
      const subscriptions = await base44.entities.UserSubscription.filter({ 
        user_id: user.id, 
        status: "active" 
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
        setStatus("Redirecting...");
        // Redirect to the actual URL
        window.location.replace(video.video_url);
      } 
      else if (type === "series" || type === "franchise") {
        const query = type === "series" ? { series_id: id } : { franchise_id: id };
        const videos = await base44.entities.Video.filter(query, 'sort_order');
        
        if (videos.length === 0) {
          setError("No episodes found for this content.");
          return;
        }

        setStatus(`Found ${videos.length} items. Starting downloads...`);
        
        // Open each video in a new tab with a slight delay
        for (let i = 0; i < videos.length; i++) {
          if (videos[i].video_url) {
            setTimeout(() => {
              window.open(videos[i].video_url, '_blank');
            }, i * 1500); // 1.5s delay between popups to avoid aggressive blocking
          }
        }
        
        setTimeout(() => {
          setStatus("Downloads initiated! Check your browser's pop-up blocker if some files didn't download.");
        }, videos.length * 1500);
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
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h1 className="text-2xl font-bold mb-2">Please wait</h1>
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}