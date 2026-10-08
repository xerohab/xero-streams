import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, HomeIcon, Film, Tv, BookOpen, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/movies", label: "Movies", Icon: Film },
  { to: "/tv-series", label: "TV Series", Icon: Tv },
  { to: "/books", label: "Books", Icon: BookOpen },
];

/** Phone-only menu so Books (and Premium) stay reachable without crowding the 5-item bottom bar. */
export default function MobileMenu({ onPremium }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const item = "flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary";
  return (
    <div className="relative md:hidden" ref={ref}>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <nav aria-label="Main menu" className="absolute right-0 z-50 mt-3 w-52 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl animate-in fade-in zoom-in-95">
          {LINKS.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className={`${item} ${pathname === to ? "font-bold text-primary" : "text-foreground"}`}><Icon className="h-4 w-4" />{label}</Link>
          ))}
          <button type="button" onClick={() => { setOpen(false); onPremium(); }} className={`${item} w-full border-t border-border/50 text-left text-foreground sm:hidden`}><Crown className="h-4 w-4 text-primary" />Premium</button>
        </nav>
      )}
    </div>
  );
}