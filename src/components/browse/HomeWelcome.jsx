import React, { useState } from "react";
import { X } from "lucide-react";

export default function HomeWelcome() {
  const [open, setOpen] = useState(() => !localStorage.getItem("xero_welcome_seen"));
  const close = () => { localStorage.setItem("xero_welcome_seen", "true"); setOpen(false); };
  if (!open) return null;
  return (
    <div className="home-onboarding">
      <p>New here? Streaming is free. Premium adds downloads. Discover more in Books.</p>
      <button type="button" onClick={close} aria-label="Dismiss first-time introduction"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}