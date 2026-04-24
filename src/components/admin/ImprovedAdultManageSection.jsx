import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Pencil, Play, ImageIcon, Tv } from "lucide-react";
import toast from "react-hot-toast";
import EditVideoModal from "./EditVideoModal";
import EditSeriesModal from "./EditSeriesModal";

export default function ImprovedAdultManageSection({ videos, seriesList, franchises, loadingVideos, loadingSeries, onRefresh }) {
  const [activeTab, setActiveTab] = useState("images");
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const adultVideos = videos.filter(v => v.is_adult);
  const adultSeries = seriesList.filter(s => s.is_adult);

  const toggleItemSelect = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (activeTab === "images" && selectedSeries) {
      const seriesItems = adultVideos.filter(v => v.series_id === selectedSeries);
      if (selectedItems.size === seriesItems.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(seriesItems.map(v => v.id)));
      }
    }
  };

  const massDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} item(s)? This cannot be undone.`)) return;
    
    setDeleting(true);
    for (const id of selectedItems) {
      await base44.entities[activeTab === "images" ? "Video" : "Video"].delete(id);
    }
    toast.success(`Deleted ${selectedItems.size} item(s)`);
    setSelectedItems(new Set());
    onRefresh();
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => { setActiveTab("images"); setSelectedItems(new Set()); setSelectedSeries(null); }}
          className={`pb-2 px-4 font-semibold border-b-2 transition-colors ${
            activeTab === "images" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="inline w-4 h-4 mr-2" /> Images & Videos
        </button>
        <button
          onClick={() => { setActiveTab("series"); setSelectedItems(new Set()); setSelectedSeries(null); }}
          className={`pb-2 px-4 font-semibold border-b-2 transition-colors ${
            activeTab === "series" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tv className="inline w-4 h-4 mr-2" /> Series
        </button>
      </div>

      {/* Images/Videos Tab */}
      {activeTab === "images" && (
        <div className="space-y-4">
          {/* Series Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Filter by Series</label>
            <select
              value={selectedSeries || ""}
              onChange={(e) => { setSelectedSeries(e.target.value || null); setSelectedItems(new Set()); }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground"
            >
              <option value="">All Videos & Images</option>
              {adultSeries.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Toolbar */}
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between bg-secondary rounded-lg p-3 border border-border">
              <span className="text-sm font-semibold text-foreground">{selectedItems.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                  {selectedItems.size === (selectedSeries ? adultVideos.filter(v => v.series_id === selectedSeries).length : adultVideos.length) ? "Deselect All" : "Select All"}
                </Button>
                <Button size="sm" variant="destructive" onClick={massDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Items Grid */}
          {loadingVideos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(selectedSeries ? adultVideos.filter(v => v.series_id === selectedSeries) : adultVideos).map(v => {
                const series = seriesList.find(s => s.id === v.series_id);
                return (
                  <div
                    key={v.id}
                    className={`relative rounded-lg overflow-hidden bg-secondary border-2 transition-colors cursor-pointer group ${
                      selectedItems.has(v.id) ? "border-red-500" : "border-transparent"
                    }`}
                    onClick={() => toggleItemSelect(v.id)}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      {selectedItems.has(v.id) ? (
                        <div className="w-5 h-5 bg-red-500 rounded border border-red-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-white/50 rounded bg-black/30" />
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-video bg-secondary overflow-hidden">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-semibold line-clamp-2">{v.title}</p>
                      {series && <p className="text-white/70 text-xs mt-0.5">{series.title}</p>}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setEditingVideo(v)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Series Tab */}
      {activeTab === "series" && (
        <div className="space-y-2">
          {loadingSeries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            adultSeries.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3 border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  {s.cover_image && <img src={s.cover_image} alt="" className="w-12 h-8 rounded object-cover" />}
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">{s.category || "uncategorized"}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSeries(s)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    if (confirm("Delete this series?")) {
                      base44.entities.Series.delete(s.id);
                      toast.success("Series deleted");
                      onRefresh();
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
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