import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

export default function LiveStreamManager() {
  const queryClient = useQueryClient();

  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["live_streams"],
    queryFn: () => base44.entities.LiveStream.list()
  });

  const updateStream = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LiveStream.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["live_streams"]);
      toast.success("Live stream updated");
    }
  });

  const createStream = useMutation({
    mutationFn: (data) => base44.entities.LiveStream.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["live_streams"]);
      toast.success("Live stream configured");
    }
  });

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  const stream = streams[0] || { title: "", stream_url: "", is_active: false, upcoming_date: "", upcoming_time: "", description: "", image_url: "" };

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get("title"),
      stream_url: formData.get("stream_url"),
      is_active: formData.get("is_active") === "on",
      upcoming_date: formData.get("upcoming_date"),
      upcoming_time: formData.get("upcoming_time"),
      description: formData.get("description"),
      image_url: formData.get("image_url")
    };

    if (stream.id) {
      updateStream.mutate({ id: stream.id, data });
    } else {
      createStream.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Live Stream Configuration</h3>
      <form onSubmit={handleSave} className="bg-secondary p-4 rounded-lg space-y-4 max-w-xl">
        <div>
          <label className="text-sm font-medium mb-1 block">Stream Title</label>
          <Input name="title" placeholder="e.g. Live Stream Event" defaultValue={stream.title} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">External Stream URL (Twitch, YouTube embed, M3U8, etc.)</label>
          <Input name="stream_url" placeholder="https://..." defaultValue={stream.stream_url} required />
        </div>
        <div className="flex items-center gap-2 pt-2 pb-4">
          <Switch name="is_active" defaultChecked={stream.is_active} />
          <label className="text-sm font-bold">Stream is currently Live</label>
        </div>
        
        <div className="border-t border-border pt-4 space-y-4">
          <h4 className="font-semibold text-primary">Upcoming Event Information</h4>
          <p className="text-xs text-muted-foreground">If the stream is not currently live, this information will be shown to users.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Upcoming Date</label>
              <Input name="upcoming_date" type="date" defaultValue={stream.upcoming_date} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Upcoming Time</label>
              <Input name="upcoming_time" type="time" defaultValue={stream.upcoming_time} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Event Description</label>
            <Input name="description" placeholder="Join us for..." defaultValue={stream.description} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Event Image URL</label>
            <Input name="image_url" placeholder="https://..." defaultValue={stream.image_url} />
          </div>
        </div>

        <Button type="submit" className="w-full">Save Stream Settings</Button>
      </form>
    </div>
  );
}