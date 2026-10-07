import React from "react";
import { Download as DownloadIcon, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

export default function DownloadsSection({ downloadLogs, videoPurchases, videos }) {
  const purchased = videoPurchases.map((p) => ({ p, video: videos.find((v) => v.id === p.video_id) })).filter((x) => x.video);

  if (downloadLogs.length === 0 && purchased.length === 0) {
    return (
      <section>
        <SectionHeader title="My Downloads" />
        <EmptyState icon={DownloadIcon} title="No downloads yet" text="Content you download across the site will appear here." ctaTo="/" />
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {downloadLogs.length > 0 && (
        <section>
          <SectionHeader title="Download History" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {downloadLogs.map((log) => {
              const video = log.content_type === "movie" || log.content_type === "episode" ? videos.find((v) => v.id === log.content_id) : null;
              return (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  {video?.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="aspect-video w-20 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex aspect-video w-20 shrink-0 items-center justify-center rounded bg-secondary">
                      <DownloadIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">{log.content_title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{log.content_type} · {new Date(log.created_date).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {purchased.length > 0 && (
        <section>
          <SectionHeader title="Purchased Videos" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {purchased.map(({ p, video }) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Film className="h-7 w-7 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
                    <p className="text-xs text-muted-foreground">Video</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => window.open(video.download_url, "_blank")}>Download</Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}