import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Search, Film, Tv, Layers, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function FranchiseMassEditor({ franchises, videos, seriesList, onSuccess }) {
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState("all"); // "all" | "movies" | "series"

  const franchise = franchises.find((f) => f.id === selectedFranchise);

  // All movies (standalone videos)
  const movies = videos.filter((v) => v.content_type === "movie" || (!v.series_id && !v.content_type));

  // Combine movies and series and franchises into one list for display
  const allItems = useMemo(() => {
    const movieItems = movies.map((v) => ({ ...v, _type: "movie" }));
    const seriesItems = seriesList.map((s) => ({ ...s, _type: "series" }));
    const franchiseItems = franchises.filter(f => f.id !== selectedFranchise).map((f) => ({ ...f, _type: "franchise" }));
    return [...movieItems, ...seriesItems, ...franchiseItems];
  }, [movies, seriesList, franchises, selectedFranchise]);

  const filtered = useMemo(() => {
    return allItems
      .filter((item) => {
        if (activeType === "movies") return item._type === "movie";
        if (activeType === "series") return item._type === "series";
        if (activeType === "franchises") return item._type === "franchise";
        return true;
      })
      .filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
  }, [allItems, search, activeType]);

  // Pre-select items already assigned to this franchise
  const handleSelectFranchise = (franchiseId) => {
    setSelectedFranchise(franchiseId);
    const preSelected = new Set();
    // We need to check all items fresh because allItems changes when selectedFranchise changes
    movies.forEach(item => { if (item.franchise_id === franchiseId) preSelected.add(`movie:${item.id}`); });
    seriesList.forEach(item => { if (item.franchise_id === franchiseId) preSelected.add(`series:${item.id}`); });
    franchises.forEach(item => { if (item.parent_id === franchiseId && item.id !== franchiseId) preSelected.add(`franchise:${item.id}`); });
    setSelected(preSelected);
  };

  const handleDeleteFranchise = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this franchise?")) return;
    try {
      await base44.entities.Franchise.delete(id);
      if (selectedFranchise === id) setSelectedFranchise("");
      toast.success("Franchise deleted");
      onSuccess();
    } catch (error) {
      toast.error("Failed to delete franchise");
    }
  };

  const toggleItem = (item) => {
    const key = `${item._type}:${item.id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedFranchise) return;
    setSaving(true);

    const movieUpdates = [];
    const seriesUpdates = [];
    const franchiseUpdates = [];

    allItems.forEach((item) => {
      const key = `${item._type}:${item.id}`;
      const isSelected = selected.has(key);
      const wasAssigned = item._type === "franchise" ? item.parent_id === selectedFranchise : item.franchise_id === selectedFranchise;

      if (isSelected && !wasAssigned) {
        // Assign to this franchise
        if (item._type === "movie") movieUpdates.push({ id: item.id, franchise_id: selectedFranchise });
        else if (item._type === "series") seriesUpdates.push({ id: item.id, franchise_id: selectedFranchise });
        else if (item._type === "franchise") franchiseUpdates.push({ id: item.id, parent_id: selectedFranchise });
      } else if (!isSelected && wasAssigned) {
        // Remove from this franchise
        if (item._type === "movie") movieUpdates.push({ id: item.id, franchise_id: "" });
        else if (item._type === "series") seriesUpdates.push({ id: item.id, franchise_id: "" });
        else if (item._type === "franchise") franchiseUpdates.push({ id: item.id, parent_id: "" });
      }
    });

    await Promise.all([
      ...movieUpdates.map(({ id, franchise_id }) =>
        base44.entities.Video.update(id, { franchise_id })
      ),
      ...seriesUpdates.map(({ id, franchise_id }) =>
        base44.entities.Series.update(id, { franchise_id })
      ),
      ...franchiseUpdates.map(({ id, parent_id }) =>
        base44.entities.Franchise.update(id, { parent_id })
      ),
    ]);

    toast.success(`Saved ${movieUpdates.length + seriesUpdates.length + franchiseUpdates.length} changes`);
    setSaving(false);
    onSuccess();
  };

  return (
    <div className="space-y-5">
      {/* Step 1: Pick franchise */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">1. Select a Franchise</label>
        <div className="flex flex-wrap gap-3">
          {franchises.map((f) => (
            <div key={f.id} className="relative group flex">
              <button
                onClick={() => handleSelectFranchise(f.id)}
                className={`flex items-center gap-1.5 pl-3 pr-8 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedFranchise === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {f.title}
              </button>
              <button 
                onClick={(e) => handleDeleteFranchise(e, f.id)}
                title="Delete Franchise"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-1 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {franchises.length === 0 && (
          <p className="text-sm text-muted-foreground">No franchises yet. Create one first.</p>
        )}
      </div>

      {selectedFranchise && (
        <>
          {/* Step 2: Pick items */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              2. Select Movies & Series to assign to <span className="text-primary">{franchise?.title}</span>
            </label>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="flex gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "movies", label: "Movies", icon: Film },
                  { id: "series", label: "Series", icon: Tv },
                  { id: "franchises", label: "Collections", icon: Layers },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveType(id)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeType === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-auto">
                {selected.size} selected
              </span>
            </div>

            {/* Item list */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {filtered.map((item) => {
                const key = `${item._type}:${item.id}`;
                const isSelected = selected.has(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-primary/10 border-primary/40"
                        : "bg-secondary border-transparent hover:border-border"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-14 h-9 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {(item.thumbnail_url || item.cover_image) ? (
                        <img src={item.thumbnail_url || item.cover_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item._type === "movie" ? <Film className="w-4 h-4 text-muted-foreground" /> : item._type === "series" ? <Tv className="w-4 h-4 text-muted-foreground" /> : <Layers className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-xs py-0">
                          {item._type === "movie" ? "Movie" : item._type === "series" ? "Series" : "Collection"}
                        </Badge>
                        {item._type !== "franchise" && item.franchise_id && item.franchise_id !== selectedFranchise && (
                          <span className="text-xs text-muted-foreground">
                            in: {franchises.find((f) => f.id === item.franchise_id)?.title}
                          </span>
                        )}
                        {item._type === "franchise" && item.parent_id && item.parent_id !== selectedFranchise && (
                          <span className="text-xs text-muted-foreground">
                            in: {franchises.find((f) => f.id === item.parent_id)?.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No results.</p>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Assignments
          </Button>
        </>
      )}
    </div>
  );
}