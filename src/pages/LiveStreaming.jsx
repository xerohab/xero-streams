import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import { Loader2, Radio, AlertCircle } from "lucide-react";

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
            <p className="text-muted-foreground">Watch our 24/7 broadcast</p>
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