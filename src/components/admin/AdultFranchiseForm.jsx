import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultFranchiseForm({ onSuccess }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    await base44.entities.Franchise.create({ title: title.trim(), description: "", cover_image: "", sort_order: 0 });
    toast.success("Franchise created!");
    setTitle("");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1 block">Franchise Name</label>
        <input
          type="text"
          placeholder="e.g. OnlyFans Leaks"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
        />
      </div>
      <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Create Franchise
      </Button>
    </form>
  );
}