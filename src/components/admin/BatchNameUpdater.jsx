import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function BatchNameUpdater({ items = [], entityType = "Image", onSuccess }) {
  const [selected, setSelected] = useState([]);
  const [baseName, setBaseName] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelected(selected.length === items.length ? [] : items.map(item => item.id));
  };

  const handleUpdate = async () => {
    if (!baseName.trim() || selected.length === 0) {
      toast.error("Enter a base name and select items");
      return;
    }

    setLoading(true);
    const selectedItems = items.filter(item => selected.includes(item.id));
    
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const newTitle = selected.length > 1 ? `${baseName.trim()} (${i + 1})` : baseName.trim();
        await base44.entities[entityType].update(selectedItems[i].id, { title: newTitle });
      }
      toast.success(`Updated ${selected.length} item(s)!`);
      setSelected([]);
      setBaseName("");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update items");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 border border-border rounded-lg p-4">
      <h3 className="font-semibold text-foreground">Batch Name Updater</h3>
      
      <div className="space-y-2">
        <Label>Base Name</Label>
        <Input
          value={baseName}
          onChange={e => setBaseName(e.target.value)}
          placeholder="e.g., Scene"
          className="bg-secondary border-border"
        />
        <p className="text-xs text-muted-foreground">Multiple items will get (1), (2), etc. appended</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Label>Select Items ({selected.length}/{items.length})</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="h-7 text-xs"
          >
            {selected.length === items.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <div className="border border-border rounded-lg bg-secondary/50 max-h-40 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No items available</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-1 rounded hover:bg-secondary">
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  id={`item-${item.id}`}
                />
                <label htmlFor={`item-${item.id}`} className="text-xs flex-1 cursor-pointer truncate text-foreground">
                  {item.title}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={loading || !baseName.trim() || selected.length === 0}
        className="w-full bg-primary hover:bg-primary/90 gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Update {selected.length} Item{selected.length !== 1 ? "s" : ""}
      </Button>
    </div>
  );
}