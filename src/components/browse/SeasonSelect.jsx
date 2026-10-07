import React from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Switch between the sibling series (seasons) of a collection. Hidden when there is only one. */
export default function SeasonSelect({ currentId, seasons }) {
  const navigate = useNavigate();
  if (!seasons || seasons.length < 2) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Season</span>
      <Select value={currentId} onValueChange={(id) => navigate(`/series?id=${id}`)}>
        <SelectTrigger className="h-9 w-[220px] border-border bg-card text-sm font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}