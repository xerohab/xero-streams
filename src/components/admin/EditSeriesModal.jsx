import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["action", "comedy", "drama", "documentary", "horror", "sci-fi", "thriller", "education", "music", "other"];

export default function EditSeriesModal({ series, franchises = [], open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: series?.title || "",
    description: series?.description || "",
    cover_image: series?.cover_image || "",
    category: series?.category || "",
    franchise_id: series?.franchise_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("cover_image", file_url);
    setUploadingCover(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Series.update(series.id, form);
    toast.success("Series updated!");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="bg-secondary border-border h-20" />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace("-", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {franchises.length > 0 && (
            <div className="space-y-1">
              <Label>Franchise / Collection</Label>
              <Select value={form.franchise_id || "_none"} onValueChange={(v) => update("franchise_id", v === "_none" ? "" : v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="No franchise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No Franchise</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Cover Image</Label>
            <div className="flex gap-2">
              <Input value={form.cover_image} onChange={(e) => update("cover_image", e.target.value)} className="bg-secondary border-border flex-1" placeholder="URL or upload →" />
              <Button type="button" variant="secondary" className="relative overflow-hidden" disabled={uploadingCover}>
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}