import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GripVertical, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultSortOrderManager({ videos, seriesList }) {
  const [mode, setMode] = useState("series");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const adultSeries = seriesList.filter(s => s.is_adult);
  const adultVideos = videos.filter(v => v.is_adult);

  useEffect(() => {
    if (mode === "series" && selectedSeries) {
      const filtered = adultVideos.filter(v => v.series_id === selectedSeries).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setItems(filtered);
    } else if (mode === "standalone") {
      const filtered = adultVideos.filter(v => !v.series_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setItems(filtered);
    }
  }, [mode, selectedSeries, videos]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setItems(reordered);
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(items.map((item, index) => base44.entities.Video.update(item.id, { sort_order: index })));
    toast.success("Sort order saved!");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div>
          <Label>Mode</Label>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant={mode === "series" ? "default" : "secondary"} onClick={() => setMode("series")} className={mode === "series" ? "bg-red-600 hover:bg-red-700" : ""}>By Series</Button>
            <Button size="sm" variant={mode === "standalone" ? "default" : "secondary"} onClick={() => setMode("standalone")} className={mode === "standalone" ? "bg-red-600 hover:bg-red-700" : ""}>Standalone</Button>
          </div>
        </div>
        {mode === "series" && (
          <div className="flex-1 min-w-48">
            <Label>Adult Series</Label>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Select series" /></SelectTrigger>
              <SelectContent>
                {adultSeries.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="adult-sort">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-96 overflow-y-auto">
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-3 bg-secondary rounded-lg p-3 border border-red-500/10">
                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                          {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover" />}
                          <span className="text-sm font-medium text-foreground truncate flex-1">{item.title}</span>
                          {item.episode_number && <span className="text-xs text-muted-foreground">EP {item.episode_number}</span>}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Sort Order
          </Button>
        </>
      )}

      {items.length === 0 && (mode === "standalone" || selectedSeries) && (
        <p className="text-muted-foreground text-sm text-center py-6">No items to sort.</p>
      )}
    </div>
  );
}