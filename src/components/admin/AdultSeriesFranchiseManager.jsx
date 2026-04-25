import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultSeriesFranchiseManager({ seriesList, franchises, onSuccess }) {
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selectedSeries) { toast.error("Select a series"); return; }
    setSaving(true);
    await base44.entities.Series.update(selectedSeries, { franchise_id: selectedFranchise || null });
    toast.success(selectedFranchise ? "Series assigned to franchise!" : "Series removed from franchise");
    setSelectedSeries("");
    setSelectedFranchise("");
    setSaving(false);
    onSuccess?.();
  };

  const getSeries = (id) => seriesList.find(s => s.id === id);
  const currentFranchise = getSeries(selectedSeries)?.franchise_id || "";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1 block">Select Series</label>
        <select
          value={selectedSeries}
          onChange={e => { setSelectedSeries(e.target.value); setSelectedFranchise(seriesList.find(s => s.id === e.target.value)?.franchise_id || ""); }}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
        >
          <option value="">-- Choose a series --</option>
          {seriesList.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {selectedSeries && (
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Move to Franchise</label>
          <select
            value={selectedFranchise}
            onChange={e => setSelectedFranchise(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          >
            <option value="">-- No Franchise (standalone) --</option>
            {franchises.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </div>
      )}

      <Button onClick={handleAssign} disabled={!selectedSeries || saving} className="bg-primary hover:bg-primary/90 gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Assignment
      </Button>

      {/* Overview of current assignments */}
      <div className="mt-6 border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Current Series → Franchise Assignments</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {seriesList.map(s => {
            const f = franchises.find(fr => fr.id === s.franchise_id);
            return (
              <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-secondary/50">
                <span className="text-foreground">{s.title}</span>
                <span className="text-muted-foreground text-xs">{f ? `→ ${f.title}` : "standalone"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}