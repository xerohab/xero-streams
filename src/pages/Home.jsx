import React, { useState } from "react";
import { Film, Tv, Loader2, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import HeroSection from "@/components/browse/HeroSection";
import HomeContinueWatching from "@/components/browse/HomeContinueWatching";
import HomeMediaSection from "@/components/browse/HomeMediaSection";
import useHomeCatalog from "@/components/browse/useHomeCatalog";
import "@/components/browse/HomeCinema.css";

export default function Home() {
  const catalog = useHomeCatalog();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("movies");
  const showMovies = catalog.rows.includes("movies");
  const showTv = catalog.rows.includes("tv");
  const active = showMovies && showTv ? selected : showTv ? "tv" : "movies";
  const surprise = catalog.videos.filter(v => !v.series_id && !v.is_adult && !v.coming_soon && v.video_url && !["book", "episode"].includes(v.content_type));
  const comingSoon = catalog.movies.filter(item => item.data.coming_soon || !item.data.video_url).sort((a,b) => (a.data.release_date || "9999").localeCompare(b.data.release_date || "9999"));
  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="home-cinema pb-16 md:pb-0">
      <Navbar />
      {catalog.rows.includes("hero") && catalog.heroSlides.length > 0 && <HeroSection slides={catalog.heroSlides} />}
      <main className={`home-container pb-6 ${catalog.heroSlides.length && catalog.rows.includes("hero") ? "" : "pt-28"}`}>
        {catalog.user && catalog.rows.includes("continue_watching") && <HomeContinueWatching videos={catalog.videos} series={catalog.series} />}
        {catalog.rows.includes("latest") && <HomeMediaSection title="Recently Added & Updated" items={catalog.latest} to="/search" id="home-recent" limit={8} />}
        {surprise.length > 0 && <div className="flex justify-end py-3"><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-primary/50 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10" onClick={() => navigate("/movie?id=" + encodeURIComponent(surprise[Math.floor(Math.random() * surprise.length)].id))}><Shuffle size={17} /> Surprise Me</button></div>}
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
        {showMovies && <HomeMediaSection title="Coming Soon" items={comingSoon} to="/movies" id="home-coming-soon" limit={8} />}
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
    </div>
  );
}