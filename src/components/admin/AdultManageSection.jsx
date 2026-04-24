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
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [selectedSeries, setSelectedSeries] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

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

  const toggleVideoSelect = (id) => {
    setSelectedVideos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSeriesSelect = (id) => {
    setSelectedSeries(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const massDeleteVideos = async () => {
    if (selectedVideos.size === 0) return;
    if (!confirm(`Delete ${selectedVideos.size} video(s)? This cannot be undone.`)) return;
    
    setDeleting(true);
    for (const id of selectedVideos) {
      await base44.entities.Video.delete(id);
    }
    toast.success(`Deleted ${selectedVideos.size} video(s)`);
    setSelectedVideos(new Set());
    onRefresh();
    setDeleting(false);
  };

  const massDeleteSeries = async () => {
    if (selectedSeries.size === 0) return;
    if (!confirm(`Delete ${selectedSeries.size} series? This cannot be undone.`)) return;
    
    setDeleting(true);
    for (const id of selectedSeries) {
      await base44.entities.Series.delete(id);
    }
    toast.success(`Deleted ${selectedSeries.size} series`);
    setSelectedSeries(new Set());
    onRefresh();
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Adult Series */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-400" /> Adult Series
          </h3>
          {selectedSeries.size > 0 && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="gap-2"
              onClick={massDeleteSeries}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete {selectedSeries.size}
            </Button>
          )}
        </div>
        {loadingSeries ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : adultSeries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No adult series yet.</p>
        ) : (
          <div className="space-y-2">
            {adultSeries.map(s => (
              <div key={s.id} className={`flex items-center justify-between bg-secondary rounded-lg p-3 border transition-colors ${selectedSeries.has(s.id) ? 'border-red-500 bg-red-500/5' : 'border-red-500/10'}`}>
                <div className="flex items-center gap-3 flex-1">
                  <button 
                    onClick={() => toggleSeriesSelect(s.id)}
                    className="flex-shrink-0 p-1 hover:bg-accent rounded"
                  >
                    {selectedSeries.has(s.id) ? (
                      <div className="w-4 h-4 bg-red-500 rounded border border-red-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-border rounded" />
                    )}
                  </button>
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-red-400" /> Adult Videos &amp; Images
          </h3>
          {selectedVideos.size > 0 && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="gap-2"
              onClick={massDeleteVideos}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete {selectedVideos.size}
            </Button>
          )}
        </div>
        {loadingVideos ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : adultVideos.length === 0 ? (
          <p className="text-muted-foreground text-sm">No adult videos yet.</p>
        ) : (
          <div className="space-y-2">
            {adultVideos.map(v => {
              const series = seriesList.find(s => s.id === v.series_id);
              return (
                <div key={v.id} className={`flex items-center justify-between bg-secondary rounded-lg p-3 border transition-colors ${selectedVideos.has(v.id) ? 'border-red-500 bg-red-500/5' : 'border-red-500/10'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                      onClick={() => toggleVideoSelect(v.id)}
                      className="flex-shrink-0 p-1 hover:bg-accent rounded"
                    >
                      {selectedVideos.has(v.id) ? (
                        <div className="w-4 h-4 bg-red-500 rounded border border-red-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      ) : (
                        <div className="w-4 h-4 border border-border rounded" />
                      )}
                    </button>
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