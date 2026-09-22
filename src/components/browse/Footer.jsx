import React from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-16">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-primary-foreground fill-current ml-0.5" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">Xero Streams</span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Xero Streams. All rights reserved.
        </p>
      </div>
    </footer>
  );
}