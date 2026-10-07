import React, { useState } from "react";
import { Film, Tv, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomeWelcome() {
  const [open, setOpen] = useState(() => !localStorage.getItem("xero_welcome_seen"));
  const close = () => { localStorage.setItem("xero_welcome_seen", "true"); setOpen(false); };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button onClick={close} aria-label="Close welcome" className="absolute right-4 top-4 text-muted-foreground"><X className="h-5 w-5" /></button>
        <Film className="mb-5 h-8 w-8 text-primary" />
        <h2 id="welcome-title" className="text-2xl font-black">Welcome to Xero Streams!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your new home for premium entertainment.</p>
        <div className="my-6 space-y-3">
          <div className="rounded-lg bg-secondary/60 p-4"><h3 className="flex items-center gap-2 font-semibold"><Film className="h-4 w-4 text-primary" />Free to Watch</h3><p className="mt-1 text-sm text-muted-foreground">Enjoy our extensive library of movies and TV series completely free of charge.</p></div>
          <div className="rounded-lg bg-secondary/60 p-4"><h3 className="flex items-center gap-2 font-semibold"><Tv className="h-4 w-4 text-primary" />Premium Features</h3><p className="mt-1 text-sm text-muted-foreground">Subscribers can download individual episodes and movies, or a whole series with Download All.</p></div>
          <p className="text-sm text-muted-foreground">Visit Books to purchase titles and expand your digital collection.</p>
        </div>
        <Button onClick={close} className="w-full font-bold">Start Watching</Button>
      </div>
    </div>
  );
}