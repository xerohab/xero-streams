import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GripVertical, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function SortOrderManager({ franchises, videos, seriesList, onSuccess }) {
  const [mode, setMode] = useState("franchise_movies"); // franchise_movies | series_episodes
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Rebuild items list when selection changes
  useEffect(() => {
    if (!selectedId) { setItems([]); return; }
    if (mode === "franchise_movies") {
      const sorted = videos
        .filter(v => v.franchise_id === selectedId && !v.series_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setItems(sorted);
    } else {
      const sorted = videos
        .filter(v => v.series_id === selectedId)
        .sort((a, b) => (a.episode_number || a.sort_order || 0) - (b.episode_number || b.sort_order || 0));
      setItems(sorted);
    }
  }, [selectedId, mode, videos]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      items.map((item, idx) =>
        base44.entities.Video.update(item.id, { sort_order: idx + 1 })
      )
    );
    toast.success("Order saved!");
    setSaving(false);
    onSuccess?.();
  };

  const selectOptions = mode === "franchise_movies"
    ? franchises.filter(f => videos.some(v => v.franchise_id === f.id && !v.series_id))
    : seriesList.filter(s => videos.some(v => v.series_id === s.id));

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "franchise_movies" ? "default" : "secondary"}
          size="sm"
          onClick={() => { setMode("franchise_movies"); setSelectedId(""); }}
        >
          Franchise Movies
        </Button>
        <Button
          variant={mode === "series_episodes" ? "default" : "secondary"}
          size="sm"
          onClick={() => { setMode("series_episodes"); setSelectedId(""); }}
        >
          Series Episodes
        </Button>
      </div>

      {/* Selector */}
      <div className="space-y-1">
        <Label>{mode === "franchise_movies" ? "Select Franchise" : "Select Series"}</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder={`Choose a ${mode === "franchise_movies" ? "franchise" : "series"}...`} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drag list */}
      {items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Drag to reorder, then click Save.</p>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sort-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 bg-secondary rounded-lg px-3 py-2 border ${snapshot.isDragging ? "border-primary shadow-lg" : "border-border"}`}
                        >
                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
                          {item.thumbnail_url && (
                            <img src={item.thumbnail_url} alt="" className="w-12 h-7 rounded object-cover shrink-0" />
                          )}
                          <span className="text-sm text-foreground font-medium flex-1 truncate">{item.title}</span>
                          {item.episode_number && (
                            <span className="text-xs text-muted-foreground shrink-0">EP {item.episode_number}</span>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Order
          </Button>
        </>
      )}

      {selectedId && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No items found.</p>
      )}
    </div>
  );
}