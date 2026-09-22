import React from "react";
import { Download, CheckCircle2, AlertCircle, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { useDownloadManager } from "@/lib/DownloadManagerContext";
import { Button } from "@/components/ui/button";

export default function DownloadManagerPopup() {
  const { downloads, isOpen, setIsOpen, clearDownload, clearCompleted } = useDownloadManager();
  const list = Object.values(downloads);
  const activeCount = list.filter((d) => d.status === "downloading").length;

  if (list.length === 0 && !isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)]">
      {isOpen ? (
        <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Downloads</span>
              {activeCount > 0 && (
                <span className="text-xs text-muted-foreground">{activeCount} active</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {list.some((d) => d.status !== "downloading") && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearCompleted} title="Clear finished">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {list.map((d) => (
              <div key={d.id} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium truncate flex-1">{d.title}</span>
                  {d.status === "downloading" && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                  {d.status === "complete" && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {d.status === "error" && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                </div>

                {d.status === "downloading" && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{d.progress}%</span>
                  </div>
                )}
                {d.status === "error" && <p className="text-xs text-destructive">{d.error}</p>}
                {d.status === "complete" && (
                  <p className="text-xs text-green-500">Saved to your downloads folder</p>
                )}

                {d.status !== "downloading" && (
                  <button
                    onClick={() => clearDownload(d.id)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-1"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-card border border-border rounded-xl shadow-2xl shadow-black/50 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Download className="w-5 h-5 text-primary" />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">
              {activeCount > 0 ? `${activeCount} downloading` : "Downloads"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">View</span>
        </button>
      )}
    </div>
  );
}