import { getAll, getWatched } from "@/hooks/useContinueWatching";
import { base44 } from "@/api/base44Client";
import React, { useState, useEffect } from "react";
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
  const [rankings,setRankings]=useState([]);
  useEffect(()=>{let live=true;base44.functions.invoke("streamingCommunity",{action:"rankings"}).then(r=>{if(live)setRankings(r.data.rankings||[])}).catch(()=>{});return()=>{live=false};},[]);
  const rankedItems=rankings.map(({key})=>[...catalog.movies,...catalog.tv].find(i=>key===(i.type==="series"?"series:":"video:")+i.data.id)).filter(Boolean).slice(0,10);
  const [,refreshHistory]=useState(0);
  useEffect(()=>{const refresh=()=>refreshHistory(n=>n+1);for(const event of ["xero-profile-changed","xero-progress-updated","storage"])window.addEventListener(event,refresh);return()=>{for(const event of ["xero-profile-changed","xero-progress-updated","storage"])window.removeEventListener(event,refresh);};},[]);
  const history = new Set([...getWatched(), ...getAll().map(v=>v.id)]);
  const genresOf = v => [...new Set([...(Array.isArray(v.genres)?v.genres:[]),v.category].filter(g=>typeof g==="string" && g.trim()))];
  const scores = new Map();
  for (const v of catalog.videos.filter(v=>history.has(v.id))) for (const g of genresOf(v)) scores.set(g,(scores.get(g)||0)+1);
  const completed=new Set(getWatched());
  const finishedSeries=new Set(catalog.series.filter(series=>{const episodes=catalog.videos.filter(v=>v.series_id===series.id && !v.coming_soon && v.video_url);return episodes.length>0 && episodes.every(v=>completed.has(v.id));}).map(s=>s.id));
  const recommendations = [...catalog.movies,...catalog.tv].filter(item=>!history.has(item.data.id) && !finishedSeries.has(item.data.id) && !item.data.coming_soon).map(item=>({...item,score:genresOf(item.data).reduce((n,g)=>n+(scores.get(g)||0),0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score || b.latestActivityAt-a.latestActivityAt);
  const genres = [...new Set([...catalog.movies,...catalog.tv].flatMap(item=>genresOf(item.data)))].sort();
  const [genre,setGenre] = useState("");
  const genreItems = [...catalog.movies,...catalog.tv].filter(item=>genresOf(item.data).includes(genre)).sort((a,b)=>b.latestActivityAt-a.latestActivityAt);
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
        <HomeMediaSection title="Top 10 This Week" items={rankedItems} id="home-top-ten" limit={10} />
        {catalog.user && <HomeMediaSection title="Recommended For You" items={recommendations} id="home-recommendations" />}
        {genres.length>0 && <section className="home-section">
          <h2 className="font-bold uppercase tracking-widest text-sm mb-4">Browse by Genre</h2>
          <div className="flex flex-wrap gap-2">{genres.map(g=><button key={g} type="button" aria-pressed={genre===g} onClick={()=>setGenre(genre===g?"":g)} className={`rounded-lg border px-4 py-3 text-sm font-semibold capitalize ${genre===g?"bg-primary text-primary-foreground":"bg-card border-border hover:border-primary"}`}>{g}</button>)}</div>
          {genre && <HomeMediaSection title={genre} items={genreItems} id="home-genre" />}
        </section>}
        {!catalog.latest.length && <p className="py-16 text-center text-muted-foreground">Content is coming soon. Check back later!</p>}
      </main>
      <Footer />
    </div>
  );
}