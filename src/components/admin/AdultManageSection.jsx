import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Pencil, Play, ImageIcon, Film, Tv } from "lucide-react";
import toast from "react-hot-toast";
import EditVideoModal from "./EditVideoModal";
import EditSeriesModal from "./EditSeriesModal";

export default function AdultManageSection({ videos, seriesList, franchises, loadingVideos, loadingSeries, onRefresh }) {
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [fetchingPosterFor, setFetchingPosterFor] = useState(null);

  const adultVideos = videos.filter(v => v.is_adult);
  const adultSeries = seriesList.filter(s => s.is_adult);

  const deleteVideo = async (id) => {
    if (!confirm("Delete this video?")) return;
    await base44.entities.Video.delete(id);
    toast.success("Deleted");
    onRefresh();
  };

  const deleteSeries = async (id) => {
    if (!confirm("Delete this series?")) return;
    await base44.entities.Series.delete(id);
    toast.success("Deleted");
    onRefresh();
  };

  const fetchPoster = async (v) => {
    setFetchingPosterFor(v.id);
    await base44.functions.invoke("fetchPoster", { title: v.title, type: "movie", videoId: v.id });
    onRefresh();
    setFetchingPosterFor(null);
  };

  return (
    <div className="space-y-6">
      {/* Adult Series */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <Tv className="w-5 h-5 text-red-400" /> Adult Series
        </h3>
        {loadingSeries ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : adultSeries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No adult series yet.</p>
        ) : (
          <div className="space-y-2">
            {adultSeries.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3 border border-red-500/10">
                <div className="flex items-center gap-3">
                  {s.cover_image && <img src={s.cover_image} alt="" className="w-12 h-8 rounded object-cover" />}
                  <div>
                    <p className="font-semibold text-foreground text-sm">{s.title}</p>
                    {s.category && <Badge variant="outline" className="text-xs mt-0.5">{s.category}</Badge>}
                    <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30 ml-1">18+</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setEditingSeries(s)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteSeries(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adult Videos */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <Film className="w-5 h-5 text-red-400" /> Adult Videos &amp; Images
        </h3>
        {loadingVideos ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : adultVideos.length === 0 ? (
          <p className="text-muted-foreground text-sm">No adult videos yet.</p>
        ) : (
          <div className="space-y-2">
            {adultVideos.map(v => {
              const series = seriesList.find(s => s.id === v.series_id);
              return (
                <div key={v.id} className="flex items-center justify-between bg-secondary rounded-lg p-3 border border-red-500/10">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-16 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{v.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {series && <span className="text-xs text-red-400">{series.title}</span>}
                        {v.episode_number && <span className="text-xs text-muted-foreground">EP {v.episode_number}</span>}
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">18+</Badge>
                        {v.is_featured && <Badge className="text-xs bg-primary/20 text-primary">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-yellow-400" title="Auto-fetch poster" onClick={() => fetchPoster(v)} disabled={fetchingPosterFor === v.id}>
                      {fetchingPosterFor === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setEditingVideo(v)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteVideo(v.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          seriesList={seriesList}
          franchises={franchises}
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          onSaved={onRefresh}
        />
      )}
      {editingSeries && (
        <EditSeriesModal
          series={editingSeries}
          franchises={franchises}
          open={!!editingSeries}
          onClose={() => setEditingSeries(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}