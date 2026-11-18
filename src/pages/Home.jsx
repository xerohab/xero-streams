import React, { useState } from "react";
import { Film, Tv, Loader2 } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import HeroSection from "@/components/browse/HeroSection";
import HomeContinueWatching from "@/components/browse/HomeContinueWatching";
import HomeMediaSection from "@/components/browse/HomeMediaSection";
import useHomeCatalog from "@/components/browse/useHomeCatalog";
import "@/components/browse/HomeCinema.css";

export default function Home() {
  const catalog = useHomeCatalog();
  const [selected, setSelected] = useState("movies");
  const showMovies = catalog.rows.includes("movies");
  const showTv = catalog.rows.includes("tv");
  const active = showMovies && showTv ? selected : showTv ? "tv" : "movies";
  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="home-cinema pb-16 md:pb-0">
      <Navbar />
      {catalog.rows.includes("hero") && catalog.heroSlides.length > 0 && <HeroSection slides={catalog.heroSlides} />}
      <main className={`home-container pb-6 ${catalog.heroSlides.length && catalog.rows.includes("hero") ? "" : "pt-28"}`}>
        {catalog.user && catalog.rows.includes("continue_watching") && <HomeContinueWatching videos={catalog.videos} series={catalog.series} />}
        {catalog.rows.includes("latest") && <HomeMediaSection title="Recently Added & Updated" items={catalog.latest} to="/search" id="home-recent" limit={8} />}
        {(showMovies || showTv) && <section className="home-discovery" aria-label="Explore entertainment">
          {showMovies && showTv && <div className="home-discovery-tabs" role="group" aria-label="Content type">
            <button type="button" aria-pressed={active === "movies"} onClick={() => setSelected("movies")}><Film size={19} /> Movies</button>
            <button type="button" aria-pressed={active === "tv"} onClick={() => setSelected("tv")}><Tv size={19} /> TV Series</button>
          </div>}
          {active === "movies" ? <React.Fragment key="movies">
            <HomeMediaSection title="Latest Movies" items={catalog.movies} to="/movies" id="home-movies" />
            <HomeMediaSection title="Latest Movie Franchises" items={catalog.movieFranchises} to="/movies" id="home-movie-franchises" />
          </React.Fragment> : <React.Fragment key="tv">
            <HomeMediaSection title="Latest TV Series" items={catalog.tv} to="/tv-series" id="home-series" />
            <HomeMediaSection title="Latest TV Franchises" items={catalog.tvFranchises} to="/tv-series" id="home-tv-franchises" />
          </React.Fragment>}
        </section>}
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
    </div>
  );
}