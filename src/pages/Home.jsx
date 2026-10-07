import React from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import HeroSection from "@/components/browse/HeroSection";
import ContinueWatchingRow from "@/components/browse/ContinueWatchingRow";
import HomeMediaSection from "@/components/browse/HomeMediaSection";
import HomeBooksRow from "@/components/browse/HomeBooksRow";
import HomeWelcome from "@/components/browse/HomeWelcome";
import useHomeCatalog from "@/components/browse/useHomeCatalog";

export default function Home() {
  const catalog = useHomeCatalog();
  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <HomeWelcome />
      {catalog.rows.includes("hero") && <HeroSection videos={catalog.heroVideos} seriesList={catalog.series} />}
      <main className={`xero-container pb-8 ${catalog.heroVideos.length && catalog.rows.includes("hero") ? "" : "pt-28"}`}>
        {catalog.rows.includes("continue_watching") && <ContinueWatchingRow />}
        {catalog.rows.includes("latest") && <HomeMediaSection title="Recently Added & Updated" items={catalog.latest} />}
        {catalog.rows.includes("tv") && <HomeMediaSection title="TV Series" items={catalog.tv} to="/tv-series" />}
        {catalog.rows.includes("movies") && <HomeMediaSection title="Movies" items={catalog.movies} to="/movies" />}
        <HomeBooksRow />
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
    </div>
  );
}