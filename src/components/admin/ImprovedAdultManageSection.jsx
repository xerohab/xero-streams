import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";

export default function ImprovedAdultManageSection({ videos, seriesList, loadingVideos, loadingSeries, onRefresh }) {
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [addToCategoryOpen, setAddToCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const adultVideos = videos.filter(v => v.is_adult);
  const adultImages = videos.filter(v => v.is_adult && !v.series_id); // Standalone images without series
  const adultSeries = seriesList.filter(s => s.is_adult);

  const toggleImageSelect = (id) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentImages = selectedSeries
      ? adultVideos.filter(v => v.series_id === selectedSeries)
      : adultImages;
    
    if (selectedImages.size === currentImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(currentImages.map(v => v.id)));
    }
  };

  const massDelete = async () => {
    if (selectedImages.size === 0) return;
    if (!confirm(`Delete ${selectedImages.size} image(s)? This cannot be undone.`)) return;
    
    setDeleting(true);
    for (const id of selectedImages) {
      await base44.entities.Video.delete(id);
    }
    toast.success(`Deleted ${selectedImages.size} image(s)`);
    setSelectedImages(new Set());
    onRefresh();
    setDeleting(false);
  };

  const massAddToCategory = async (categoryId) => {
    if (selectedImages.size === 0) return;
    
    for (const id of selectedImages) {
      await base44.entities.Video.update(id, { series_id: categoryId });
    }
    toast.success(`Added ${selectedImages.size} image(s) to category`);
    setSelectedImages(new Set());
    onRefresh();
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    
    await base44.entities.Series.create({
      title: newCategoryName,
      is_adult: true,
    });
    toast.success("Category created");
    setNewCategoryName("");
    setAddToCategoryOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Category */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Manage Adult Images & Categories</h3>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddToCategoryOpen(!addToCategoryOpen)}>
          <FolderPlus className="w-4 h-4" />
          New Category
        </Button>
      </div>

      {/* Create Category Form */}
      {addToCategoryOpen && (
        <div className="bg-secondary rounded-lg p-4 border border-border space-y-3">
          <input
            type="text"
            placeholder="Category name..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          />
          <div className="flex gap-2">
            <Button onClick={createCategory} className="bg-primary hover:bg-primary/90">Create</Button>
            <Button variant="outline" onClick={() => { setAddToCategoryOpen(false); setNewCategoryName(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Filter by Category</label>
        <select
          value={selectedSeries || ""}
          onChange={(e) => { setSelectedSeries(e.target.value || null); setSelectedImages(new Set()); }}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground"
        >
          <option value="">All Uncategorized Images</option>
          {adultSeries.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Selection Toolbar */}
      {selectedImages.size > 0 && (
        <div className="flex items-center justify-between bg-secondary rounded-lg p-3 border border-border">
          <span className="text-sm font-semibold text-foreground">{selectedImages.size} selected</span>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {selectedImages.size === (selectedSeries ? adultVideos.filter(v => v.series_id === selectedSeries).length : adultImages.length) ? "Deselect All" : "Select All"}
            </Button>

            {/* Add to Category Dropdown */}
            <div className="flex gap-1">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    massAddToCategory(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="px-2 py-1 bg-background border border-border rounded-md text-sm text-foreground cursor-pointer"
              >
                <option value="">Add to category...</option>
                {adultSeries.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <Button size="sm" variant="destructive" onClick={massDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {loadingVideos ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {(selectedSeries ? adultVideos.filter(v => v.series_id === selectedSeries) : adultImages).map(v => {
            const series = seriesList.find(s => s.id === v.series_id);
            return (
              <div
                key={v.id}
                className={`relative rounded-lg overflow-hidden bg-secondary border-2 transition-colors cursor-pointer group ${
                  selectedImages.has(v.id) ? "border-red-500" : "border-transparent"
                }`}
                onClick={() => toggleImageSelect(v.id)}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  {selectedImages.has(v.id) ? (
                    <div className="w-5 h-5 bg-red-500 rounded border border-red-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-white/50 rounded bg-black/30" />
                  )}
                </div>

                {/* Image */}
                <div className="aspect-video bg-secondary overflow-hidden">
                  {v.thumbnail_url || v.image_url ? (
                    <img src={v.thumbnail_url || v.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Category Label */}
                {series && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs font-semibold">{series.title}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}