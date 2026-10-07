import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Play, Search, User, LogIn, Crown, Film, Tv, Settings, LogOut, Heart, Download, HomeIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePremiumModal } from "@/lib/PremiumModalContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const { open: openPremium } = usePremiumModal();
  const profileRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    base44.auth.me().then(setUser).catch(() => {});
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      base44.analytics.track({ eventName: "search_performed", properties: { query: searchQuery.trim() } });
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md shadow-md" : "bg-gradient-to-b from-background/90 via-background/40 to-transparent"}`}>
        <div className="flex items-center justify-between px-6 md:px-12 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shadow-lg shadow-primary/20">
                <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground hidden sm:block">Xero Streams</span>
            </Link>
            
            {/* Desktop Main Nav */}
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
              <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Home</Link>
              <Link to="/movies" className={`transition-colors ${location.pathname === '/movies' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Movies</Link>
              <Link to="/tv-series" className={`transition-colors ${location.pathname === '/tv-series' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>TV Series</Link>
              <Link to="/books" className={`transition-colors ${location.pathname === '/books' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Books</Link>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, series, books..."
                  className="h-9 w-48 md:w-64 bg-black/40 border-border text-sm rounded-full px-4"
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                />
              </form>
            ) : (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setSearchOpen(true)}>
                <Search className="w-5 h-5" />
              </Button>
            )}

            {!searchOpen && (
              <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-primary gap-2 transition-colors" onClick={() => openPremium()}>
                <Crown className="w-4 h-4" />
                <span className="font-semibold">Premium</span>
              </Button>
            )}

            {user ? (
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground hover:ring-2 hover:ring-primary transition-all ml-1"
                >
                  <User className="w-5 h-5" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-card border border-border rounded-lg shadow-xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-3 border-b border-border/50 mb-1 bg-background/50">
                      <p className="text-sm font-bold text-foreground truncate">{user.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    
                    <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"><User className="w-4 h-4 text-muted-foreground" /> My Xero</Link>
                    <Link to="/dashboard#list" onClick={() => setProfileOpen(false)} className="px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"><Heart className="w-4 h-4 text-muted-foreground" /> My List</Link>
                    <Link to="/dashboard#downloads" onClick={() => setProfileOpen(false)} className="px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"><Download className="w-4 h-4 text-muted-foreground" /> Downloads</Link>
                    {user.role === "admin" && (
                      <Link to="/admin" onClick={() => setProfileOpen(false)} className="px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"><Settings className="w-4 h-4 text-muted-foreground" /> Admin Settings</Link>
                    )}
                    <div className="border-t border-border/50 my-1"></div>
                    <button onClick={() => base44.auth.logout()} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary flex items-center gap-3 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                className="gap-2 font-bold rounded-full px-5 ml-1 shadow-md shadow-primary/20"
                onClick={() => {
                  base44.analytics.track({ eventName: "sign_in_initiated" });
                  base44.auth.redirectToLogin(window.location.pathname);
                }}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around p-1">
          <Link to="/" className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <HomeIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/movies" className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${location.pathname === '/movies' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Film className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Movies</span>
          </Link>
          <Link to="/tv-series" className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${location.pathname === '/tv-series' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Tv className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Series</span>
          </Link>
          <button onClick={() => { window.scrollTo({top: 0}); setSearchOpen(true); }} className="flex flex-col items-center p-2 min-w-[64px] text-muted-foreground hover:text-foreground transition-colors">
            <Search className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <Link to="/dashboard" className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${location.pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">My Xero</span>
          </Link>
        </div>
      </div>
    </>
  );
}