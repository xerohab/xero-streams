import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadSeriesZip } from "@/lib/downloadUtils";
import toast from "react-hot-toast";

export default function SeriesDownloadButton({ series, isPremium, onViewPlans }) {
  const [progress, setProgress] = useState(null);
  const download = async () => {
    if (!isPremium) { onViewPlans(); return; }
    setProgress({ current: 0, total: 0 });
    try {
      await downloadSeriesZip("series", series.id, series.title, setProgress);
      toast.success("All episode downloads started.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };
  return <Button variant="outline" className="xero-action" onClick={download} disabled={!!progress}>{progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{progress ? `Downloading ${progress.current}/${progress.total}` : "Download All"}</Button>;
}