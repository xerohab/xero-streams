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
  const comingSoon = [...catalog.movies.filter(item=>item.data.coming_soon),...catalog.videos.filter(v=>v.series_id && v.coming_soon).map(data=>({type:"video",data,latestActivityAt:Date.parse(data.created_date)||0}))].sort((a,b) => (a.data.release_date || "9999").localeCompare(b.data.release_date || "9999"));
  const [reminders,setReminders]=useState([]);
  const [reminderBusy,setReminderBusy]=useState(false);
  const [reminderError,setReminderError]=useState("");
  useEffect(()=>{let active=true;if(catalog.user?.id)base44.entities.ReleaseReminder.filter({user_id:catalog.user.id}).then(rows=>{if(active)setReminders(rows)}).catch(()=>{if(active)setReminderError("Unable to load reminders")});else setReminders([]);return()=>{active=false};},[catalog.user?.id]);
  const toggleReminder=async(id)=>{
    if(!catalog.user){base44.auth.redirectToLogin(window.location.href);return;}
    setReminderBusy(true);setReminderError("");
    try{const rows=reminders.filter(r=>r.video_id===id);if(rows.length){await Promise.all(rows.map(r=>base44.entities.ReleaseReminder.delete(r.id)));setReminders(old=>old.filter(r=>r.video_id!==id));}else{const row=await base44.entities.ReleaseReminder.create({user_id:catalog.user.id,video_id:id});setReminders(old=>[...old,row]);}}catch{setReminderError("Unable to save reminder");}finally{setReminderBusy(false);}
  };
  const [rankings,setRankings]=useState([]);
  useEffect(()=>{let live=true;base44.functions.invoke("streamingCommunity",{action:"rankings"}).then(r=>{if(live)setRankings(r.data.rankings||[])}).catch(()=>{});return()=>{live=false};},[]);
  const rankedItems=rankings.map(({key})=>[...catalog.movies,...catalog.tv].find(i=>key===(i.type==="series"?"series:":"video:")+i.data.id)).filter(Boolean).slice(0,10);
  const history = new Set([...getWatched(), ...getAll().map(v=>v.id)]);
  const genresOf = v => [...new Set([...(Array.isArray(v.genres)?v.genres:[]),v.category].filter(g=>typeof g==="string" && g.trim()))];
  const scores = new Map();
  for (const v of catalog.videos.filter(v=>history.has(v.id))) for (const g of genresOf(v)) scores.set(g,(scores.get(g)||0)+1);
  const recommendations = [...catalog.movies,...catalog.tv].filter(item=>!history.has(item.data.id) && !item.data.coming_soon).map(item=>({...item,score:genresOf(item.data).reduce((n,g)=>n+(scores.get(g)||0),0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score || b.latestActivityAt-a.latestActivityAt);
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
        {comingSoon.length>0 && <details className="rounded-lg border border-border bg-card p-3"><summary className="cursor-pointer font-bold">Coming Soon · {comingSoon.length} upcoming releases</summary><HomeMediaSection title="Upcoming Releases" items={comingSoon} id="home-coming-soon" limit={8} /><div className="divide-y divide-border">{comingSoon.slice(0,8).map(({data:v})=><div key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{v.title} <small className="text-muted-foreground">{v.release_date||"Date TBA"}</small></span><button disabled={reminderBusy} className="rounded border border-primary px-3 py-1 text-xs text-primary" onClick={()=>toggleReminder(v.id)}>{reminders.some(r=>r.video_id===v.id)?"Reminder saved":"Remind Me"}</button></div>)}</div>{reminderError&&<p role="alert">{reminderError}</p>}</details>}
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