import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import { Loader2, Radio, AlertCircle, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function LiveStreaming() {
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["live_streams"],
    queryFn: () => base44.entities.LiveStream.list()
  });

  const stream = streams[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <Radio className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground">Live Stream</h1>
            <p className="text-muted-foreground">Watch our live stream (when available)</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : stream?.is_active && stream?.stream_url ? (
          <div className="bg-card border-border rounded-xl overflow-hidden shadow-lg">
            <div className="bg-black aspect-video relative">
              <iframe
                src={stream.stream_url}
                className="w-full h-full absolute inset-0"
                allowFullScreen
                allow="autoplay; encrypted-media"
              ></iframe>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold">{stream.title || "Live Stream"}</h2>
            </div>
          </div>
        ) : stream?.upcoming_date ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg max-w-3xl mx-auto">
            {stream.image_url ? (
              <div className="aspect-video relative w-full bg-muted">
                <img src={stream.image_url} alt="Upcoming Event" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                  <h2 className="text-3xl font-bold text-white">{stream.title || "Upcoming Event"}</h2>
                </div>
              </div>
            ) : (
              <div className="bg-secondary p-8 border-b border-border">
                <h2 className="text-3xl font-bold text-center">{stream.title || "Upcoming Event"}</h2>
              </div>
            )}
            <div className="p-8 text-center flex flex-col items-center">
              <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">{format(new Date(stream.upcoming_date), "MMMM do, yyyy")}</span>
                </div>
                {stream.upcoming_time && (
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{stream.upcoming_time}</span>
                  </div>
                )}
              </div>
              {stream.description ? (
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">{stream.description}</p>
              ) : (
                <p className="text-muted-foreground">Stay tuned for our next live stream event.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-secondary border border-border rounded-xl p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Stream Offline</h2>
            <p className="text-muted-foreground">There is no active live stream at the moment. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}