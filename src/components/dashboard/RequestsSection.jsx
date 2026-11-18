import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/browse/SectionHeader";

export default function RequestsSection({ userId, hasAccess, requests, onChanged, onViewPlans }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [requesting, setRequesting] = useState(false);

  const [community,setCommunity]=useState([]);
  const [votes,setVotes]=useState([]);
  const [voteBusy,setVoteBusy]=useState(false);
  const [voteError,setVoteError]=useState("");
  const refreshCommunity=async()=>{const [rows,own]=await Promise.all([base44.functions.invoke("streamingCommunity",{action:"votes"}).then(r=>r.data.requests||[]),base44.entities.RequestVote.filter({user_id:userId})]);setCommunity(rows);setVotes(own);};
  useEffect(()=>{if(userId)refreshCommunity().catch(()=>setVoteError("Unable to load community requests"));},[userId]);
  const toggleVote=async(id)=>{setVoteBusy(true);setVoteError("");try{const existing=votes.filter(v=>v.request_id===id);if(existing.length)await Promise.all(existing.map(v=>base44.entities.RequestVote.delete(v.id)));else await base44.entities.RequestVote.create({user_id:userId,request_id:id});await refreshCommunity();}catch{setVoteError("Unable to save vote");}finally{setVoteBusy(false);}};
  const submitRequest = async (e) => {
    e.preventDefault();
    if (!title) return;
    setRequesting(true);
    try {
      const payload = { user_id: userId, title, status: "pending" };
      if (desc) payload.description = desc;
      await base44.entities.ContentRequest.create(payload);
      setTitle("");
      setDesc("");
      onChanged();
      await refreshCommunity();
    } catch (err) {
      console.error(err);
      alert("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <section>
      <SectionHeader title="Request Content" />
      <div className="rounded-xl border border-border bg-card p-6">
        {!hasAccess ? (
          <div className="py-6 text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <h3 className="mb-1 text-lg font-semibold">Premium Feature</h3>
            <p className="mb-4 text-sm text-muted-foreground">You need an active subscription to request content.</p>
            <Button variant="outline" onClick={onViewPlans}>View Plans</Button>
          </div>
        ) : (
          <>
            <form onSubmit={submitRequest} className="mb-6 space-y-4 border-b border-border pb-6">
              <div>
                <label className="mb-1 block text-sm font-medium">Movie / TV Series Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. The Matrix" className="bg-secondary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Additional Details (Optional)</label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Any specific season?" className="bg-secondary" />
              </div>
              <Button type="submit" disabled={requesting || !title}>
                {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Submit Request
              </Button>
            </form>

            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">My Previous Requests</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't requested any content yet.</p>
            ) : (
              <div className="grid gap-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                    <p className="font-semibold">{req.title}</p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${req.status === "fulfilled" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                      {req.status === "fulfilled" ? "Available Now" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-4"><h3 className="font-bold mb-3">Community Requests</h3>
        {community.length===0 && <p className="text-sm text-muted-foreground">No pending requests to vote on.</p>}
        {community.map(req=><div key={req.id} className="flex items-center justify-between gap-3 border-b border-border py-2"><span className="text-sm">{req.title} · {req.count} votes</span><Button size="sm" variant={votes.some(v=>v.request_id===req.id)?"default":"outline"} disabled={voteBusy} onClick={()=>toggleVote(req.id)}>{votes.some(v=>v.request_id===req.id)?"Voted":"Vote"}</Button></div>)}
        {voteError&&<p role="alert" className="text-sm text-red-400">{voteError}</p>}
      </div>
    </section>
  );
}