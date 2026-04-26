import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Shield, LogOut, Search, User, LogIn, Cast } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Global cast window reference so any page can send video to it
let _castWindow = null;
export function getCastWindow() { return _castWindow; }
export function setCastWindow(w) { _castWindow = w; }
export function isCastWindowOpen() { return _castWindow && !_castWindow.closed; }

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [castActive, setCastActive] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Poll cast window status
  useEffect(() => {
    const interval = setInterval(() => {
      setCastActive(isCastWindowOpen());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    base44.auth.me().then(setUser).catch(() => {});
    base44.functions.invoke("checkAdminStatus", {}).then(r => setIsAdmin(r.data?.isAdmin === true)).catch(() => {});
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleOpenCast = () => {
    if (isCastWindowOpen()) {
      // Focus existing window
      _castWindow.focus();
      return;
    }
    const w = window.open("/cast?standby=1", "_blank");
    setCastWindow(w);
    setCastActive(true);
  };

  const handleCloseCast = () => {
    if (_castWindow && !_castWindow.closed) _castWindow.close();
    setCastWindow(null);
    setCastActive(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-gradient-to-b from-background/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-6 md:px-16 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground">
            Xero Streams
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Cast Mode */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-colors ${castActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title={castActive ? "Cast mode active — click to stop" : "Start Cast Mode"}
            onClick={castActive ? handleCloseCast : handleOpenCast}
          >
            <Cast className="w-4 h-4" />
          </Button>

          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 w-40 md:w-56 bg-black/40 border-border text-sm"
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
              />
              <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Search className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4" />
            </Button>
          )}

          {/* Leaks link hidden */}

          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">{user.full_name?.split(" ")[0] || "Profile"}</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => base44.auth.logout()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}