import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Shield, LogOut, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    base44.auth.me().then(setUser).catch(() => {});
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isAdmin = user?.role === "admin";

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
            StreamLine
          </span>
        </Link>

        <div className="flex items-center gap-2">
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

          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            </Link>
          )}
          {user && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}