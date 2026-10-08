import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sparkles, X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENRE_OPTIONS } from "@/lib/genreAdmin";

/**
 * Reusable multi-genre selector. value is an array of display names; onChange
 * receives the updated array. Pass `aiDetected` to badge AI-suggested genres.
 */
export default function GenreSelect({ value = [], onChange, label = "Genres", className = "", aiDetected = false, size = "md" }) {
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? value : [];
  const h = size === "sm" ? "min-h-7 text-xs py-1" : "min-h-9 py-1.5";

  const toggle = (genre) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else {
      onChange([...selected, genre]);
    }
  };

  const remove = (genre, e) => {
    e.stopPropagation();
    onChange(selected.filter((g) => g !== genre));
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label className="text-xs flex items-center gap-1.5">
          {label}
          {aiDetected && <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="w-3 h-3" />AI</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={cn("flex w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary", h)}>
            {selected.length === 0 && <span className="text-muted-foreground text-xs">Select genres...</span>}
            {selected.map((g) => (
              <span key={g} className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                {g}
                <X className="h-3 w-3 cursor-pointer" onClick={(e) => remove(g, e)} />
              </span>
            ))}
            <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
          <Command>
            <CommandInput placeholder="Search genres..." />
            <CommandList>
              <CommandEmpty>No genre found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {GENRE_OPTIONS.map((g) => (
                  <CommandItem key={g} value={g} onSelect={() => toggle(g)}>
                    <Check className={cn("mr-2 h-4 w-4", selected.includes(g) ? "opacity-100" : "opacity-0")} />
                    {g}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}