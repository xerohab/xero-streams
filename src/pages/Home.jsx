import React from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import HeroSection from "@/components/browse/HeroSection";
import HomeContinueWatching from "@/components/browse/HomeContinueWatching";
import HomeMediaSection from "@/components/browse/HomeMediaSection";
import useHomeCatalog from "@/components/browse/useHomeCatalog";
import "@/components/browse/HomeCinema.css";

export default function Home() {
  const catalog = useHomeCatalog();
  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="home-cinema pb-16 md:pb-0">
      <Navbar />
      {catalog.rows.includes("hero") && catalog.heroSlides.length > 0 && <HeroSection slides={catalog.heroSlides} />}
      <main className={`home-container pb-6 ${catalog.heroSlides.length && catalog.rows.includes("hero") ? "" : "pt-28"}`}>
        {catalog.user && catalog.rows.includes("continue_watching") && <HomeContinueWatching videos={catalog.videos} series={catalog.series} />}
        {catalog.rows.includes("latest") && <HomeMediaSection title="Recently Added & Updated" items={catalog.latest} to="/search" id="home-recent" limit={8} />}
        {catalog.rows.includes("tv") && <><HomeMediaSection title="Latest TV Series" items={catalog.tv} to="/tv-series" id="home-series" /><HomeMediaSection title="Latest TV Franchises" items={catalog.tvFranchises} to="/tv-series" id="home-tv-franchises" /></>}
        {catalog.rows.includes("movies") && <><HomeMediaSection title="Latest Movies" items={catalog.movies} to="/movies" id="home-movies" /><HomeMediaSection title="Latest Movie Franchises" items={catalog.movieFranchises} to="/movies" id="home-movie-franchises" /></>}
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
    </div>
  );
}