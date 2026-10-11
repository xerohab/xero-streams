import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MessageSquare, Download as DownloadIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function RequestsManager() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState("content");

  const { data: requests = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["content_requests_all"],
    queryFn: () => base44.entities.ContentRequest.list("-created_date")
  });

  const { data: downloadRequests = [], isLoading: isLoadingDownload } = useQuery({
    queryKey: ["download_requests_all"],
    queryFn: () => base44.entities.DownloadRequest.list("-created_date")
  });

  const isLoading = isLoadingContent || isLoadingDownload;

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list()
  });

  const markFulfilled = useMutation({
    mutationFn: /** @param {{id: string, user_id: string, title: string}} req */ async (req) => {
      await base44.entities.ContentRequest.update(req.id, { status: "fulfilled" });
      const user = users.find(u => u.id === req.user_id);
      if (user?.email) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `Your content request "${req.title}" is now available!`,
          body: `Hi ${user.full_name || 'there'},\n\nGreat news! The content you requested ("${req.title}") is now available on our platform. Log in to check it out!\n\nEnjoy!`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content_requests_all"] });
      toast.success("Request marked as fulfilled and email sent!");
    }
  });

  const deleteRequest = useMutation({
    mutationFn: /** @param {string} id */ (id) => base44.entities.ContentRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["content_requests_all"] })
  });

  const markDownloadFulfilled = useMutation({
    mutationFn: /** @param {{id: string, user_id: string, title: string}} req */ async (req) => {
      await base44.entities.DownloadRequest.update(req.id, { status: "fulfilled" });
      const user = users.find(u => u.id === req.user_id);
      if (user?.email) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `Your download request "${req.title}" is now available!`,
          body: `Hi ${user.full_name || 'there'},\n\nGreat news! The download you requested ("${req.title}") is now available on our platform. Log in to check it out!\n\nEnjoy!`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["download_requests_all"] });
      toast.success("Download request marked as fulfilled and email sent!");
    }
  });

  const deleteDownloadRequest = useMutation({
    mutationFn: /** @param {string} id */ (id) => base44.entities.DownloadRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["download_requests_all"] })
  });

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 border-b border-border w-full pb-2">
          <button
            onClick={() => setActiveTab("content")}
            className={`font-semibold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'content' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Content Requests</span>
          </button>
          <button
            onClick={() => setActiveTab("download")}
            className={`font-semibold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'download' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            <span className="flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Download Requests</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 mt-4">
        {activeTab === "content" && requests.map(req => {
          const u = users.find(user => user.id === req.user_id);
          return (
            <div key={req.id} className={`p-4 rounded-lg border ${req.status === 'fulfilled' ? 'bg-secondary/50 border-border' : 'bg-secondary border-primary/30'}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold text-lg">{req.title}</h4>
                  {req.description && <p className="text-muted-foreground text-sm mt-1">{req.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> {u?.email || "Unknown User"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {req.status === "pending" ? (
                    <Button size="sm" onClick={() => markFulfilled.mutate({ id: req.id, user_id: req.user_id, title: req.title })} disabled={markFulfilled.isPending} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Fulfilled & Notify
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded">Fulfilled</span>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8" onClick={() => deleteRequest.mutate(req.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {activeTab === "content" && requests.length === 0 && (
          <p className="text-center py-8 text-muted-foreground bg-secondary rounded-lg">No content requests yet.</p>
        )}

        {activeTab === "download" && downloadRequests.map(req => {
          const u = users.find(user => user.id === req.user_id);
          return (
            <div key={req.id} className={`p-4 rounded-lg border ${req.status === 'fulfilled' ? 'bg-secondary/50 border-border' : 'bg-secondary border-primary/30'}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    {req.title}
                    <span className="text-[10px] px-2 py-0.5 rounded-full border uppercase text-muted-foreground">{req.content_type}</span>
                  </h4>
                  {req.description && <p className="text-muted-foreground text-sm mt-1">{req.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> {u?.email || "Unknown User"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {req.status === "pending" ? (
                    <Button size="sm" onClick={() => markDownloadFulfilled.mutate({ id: req.id, user_id: req.user_id, title: req.title })} disabled={markDownloadFulfilled.isPending} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Fulfilled & Notify
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded">Fulfilled</span>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8" onClick={() => deleteDownloadRequest.mutate(req.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {activeTab === "download" && downloadRequests.length === 0 && (
          <p className="text-center py-8 text-muted-foreground bg-secondary rounded-lg">No download requests yet.</p>
        )}
      </div>
    </div>
  );
}

function UserIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
