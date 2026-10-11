import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Trash2, Images } from "lucide-react";
import toast from "react-hot-toast";

export default function AdultBulkImageUpload({ adultSeriesList, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState("");
  const [contentType, setContentType] = useState("movie");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef();

  const handleFilesSelected = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    const urls = selected.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) { toast.error("Select images first"); return; }
    if (contentType === "episode" && !selectedSeries) { toast.error("Select a series first"); return; }
    setUploading(true);
    setUploadProgress(0);

    const records = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      records.push({
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        video_url: file_url,
        thumbnail_url: file_url,
        content_type: contentType === "episode" ? "episode" : "movie",
        series_id: contentType === "episode" ? selectedSeries : undefined,
        episode_number: contentType === "episode" ? i + 1 : undefined,
        is_adult: true,
        is_featured: false,
      });
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    await base44.entities.Video.bulkCreate(records);
    toast.success(`Uploaded ${records.length} image${records.length !== 1 ? "s" : ""}!`);
    setFiles([]);
    setPreviews([]);
    setSelectedSeries("");
    setUploadProgress(0);
    setUploading(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Standalone Images</SelectItem>
              <SelectItem value="episode">Part of a Series</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {contentType === "episode" && (
          <div className="flex-1 min-w-48">
            <Label>Adult Series</Label>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Select series" /></SelectTrigger>
              <SelectContent>
                {adultSeriesList?.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div
        className="border-2 border-dashed border-red-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-red-500/60 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Images className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
        <p className="text-foreground font-semibold mb-1">Click to select images</p>
        <p className="text-muted-foreground text-sm">Select multiple images at once (jpg, png, gif, webp)</p>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFilesSelected} />
      </div>

      {previews.length > 0 && (
        <div>
          <Label className="mb-2 block">{files.length} image{files.length !== 1 ? "s" : ""} selected</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {previews.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt="" className="w-full aspect-square object-cover rounded-md" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <Button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload {files.length > 0 ? `${files.length} Image${files.length !== 1 ? "s" : ""}` : "Images"}
      </Button>
    </div>
  );
}
