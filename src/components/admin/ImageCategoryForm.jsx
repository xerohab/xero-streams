import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ImageCategoryForm({ isAdult = false, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error("Category name is required"); return; }
    setSaving(true);

    await base44.entities.ImageCategory.create({
      ...form,
      is_adult: isAdult,
    });

    toast.success("Image category created!");
    setForm({ title: "", description: "" });
    setSaving(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Category Name *</Label>
        <Input
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Amateur, Solo, Couples..."
          className="bg-secondary border-border"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Optional description"
          className="bg-secondary border-border"
          rows={2}
        />
      </div>

      <Button type="submit" disabled={saving} className={`w-full font-bold gap-2 ${isAdult ? "bg-red-600 hover:bg-red-700" : ""}`}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Create Category
      </Button>
    </form>
  );
}