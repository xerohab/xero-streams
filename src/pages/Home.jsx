import React from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import HeroSection from "@/components/browse/HeroSection";
import HomeContinueWatching from "@/components/browse/HomeContinueWatching";
import HomeMediaSection from "@/components/browse/HomeMediaSection";
import HomeBooksRow from "@/components/browse/HomeBooksRow";
import useHomeCatalog from "@/components/browse/useHomeCatalog";
import "@/components/browse/HomeCinema.css";

export const XERO_HOME_BUILD = "CINEMA-HOME-01";

export default function Home() {
  const catalog = useHomeCatalog();
  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="home-cinema pb-16 md:pb-0">
      <Navbar />
      {catalog.rows.includes("hero") && <HeroSection videos={catalog.heroVideos} seriesList={catalog.series} franchises={catalog.franchises} />}
      <main className={`home-container pb-8 ${catalog.heroVideos.length && catalog.rows.includes("hero") ? "" : "pt-28"}`}>
        {catalog.user && catalog.rows.includes("continue_watching") && <HomeContinueWatching videos={catalog.videos} series={catalog.series} />}
        {catalog.rows.includes("latest") && <HomeMediaSection title="Recently Added & Updated" items={catalog.latest} to="/search" id="home-recent" />}
        {catalog.rows.includes("tv") && <HomeMediaSection title="TV Series" items={catalog.tv} to="/tv-series" id="home-series" />}
        {catalog.rows.includes("movies") && <HomeMediaSection title="Movies" items={catalog.movies} to="/movies" id="home-movies" />}
        <HomeBooksRow />
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
      <div className="pointer-events-none fixed bottom-1 right-2 z-[60] text-[9px] tracking-wider text-muted-foreground/40 select-none">
        XERO BUILD: {XERO_HOME_BUILD}
      </div>
    </div>
  );
}