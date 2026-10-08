import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { GENRE_OPTIONS } from "@/lib/genreAdmin";

/**
 * Reusable genre dropdown. value/onChange use display names (e.g. "Sci-Fi").
 * Pass `aiDetected` to badge an AI-suggested genre.
 */
export default function GenreSelect({ value, onChange, label = "Genre", className = "", aiDetected = false, size = "md" }) {
  const h = size === "sm" ? "h-7 text-xs" : "h-9";
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label className="text-xs flex items-center gap-1.5">
          {label}
          {aiDetected && <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="w-3 h-3" />AI</span>}
        </Label>
      )}
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className={`bg-secondary border-border ${h}`}>
          <SelectValue placeholder="Select genre" />
        </SelectTrigger>
        <SelectContent>
          {GENRE_OPTIONS.map((g) => (
            <SelectItem key={g} value={g}>{g}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}