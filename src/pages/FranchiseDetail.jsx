import { getWatched } from "@/hooks/useContinueWatching";
import {useProfileFavourites} from "@/lib/useProfileFavourites";
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import CollectionHero from "@/components/browse/CollectionHero";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import ReviewSection from "@/components/browse/ReviewSection";
import GenreChips from "@/components/browse/GenreChips";
import { getItemActivityAt, isRecentlyUpdated } from "@/lib/activityUtils";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

export default function FranchiseDetail() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const franchiseId = urlParams.get("id");

  const [order, setOrder] = useState("collection");
  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const profileFavourites=useProfileFavourites(user,"favourite_franchises");
  const isFavourited=profileFavourites.values.includes(franchiseId);
  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(location.pathname + location.search); return; }
    await profileFavourites.toggle(franchiseId);
  };

  const { data: franchise, isLoading: loadingFranchise } = useQuery({
    queryKey: ["franchise", franchiseId],
    queryFn: async () => {
      const list = await base44.entities.Franchise.filter({ id: franchiseId });
      return list[0];
    },
    enabled: !!franchiseId,
  });

  useEffect(() => {
    if (franchise) document.title = `${franchise.title} | Xero Streams`;
    return () => { document.title = "Xero Streams"; };
  }, [franchise]);

  const { data: allSeries = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["cinema_catalog", "series"],
    queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000),
  });

  const { data: allVideos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["cinema_catalog", "videos"],
    queryFn: () => loadMediaRecords(base44.entities.Video),
  });

  const { data: allFranchises = [], isLoading: loadingFranchises } = useQuery({
    queryKey: ["cinema_catalog", "franchises"],
    queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000),
  });

  const subFranchises = allFranchises
    .filter((f) => f.parent_id === franchiseId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const franchiseSeries = allSeries
    .filter((s) => s.franchise_id === franchiseId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));

  const franchiseMovies = allVideos
    .filter((v) => v.franchise_id === franchiseId && !v.series_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (loadingFranchise || loadingSeries || loadingVideos || loadingFranchises) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!franchise) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-foreground mb-2">Franchise not found</h2>
          <Link to="/"><Button variant="secondary">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const ids = new Set([franchiseId]);
  for (let i = 0; i < allFranchises.length; i++) for (const f of allFranchises) if (ids.has(f.parent_id)) ids.add(f.id);
  const seasons = allSeries.filter(s => ids.has(s.franchise_id) && !s.is_adult);
  const seasonMap = new Map(seasons.map(s => [s.id,s]));
  const playable = allVideos.filter(v => !v.is_adult && !v.coming_soon && v.video_url && (v.series_id ? seasonMap.has(v.series_id) : ids.has(v.franchise_id)));
  const release = v => Date.parse(v.release_date || seasonMap.get(v.series_id)?.release_year || v.release_year || "") || Infinity;
  const ordered = [...playable].sort((a,b) => order === "release" ? (release(a)-release(b) || a.title.localeCompare(b.title)) : ((seasonMap.get(a.series_id)?.sort_order ?? a.sort_order ?? 0) - (seasonMap.get(b.series_id)?.sort_order ?? b.sort_order ?? 0) || (a.episode_number || 0)-(b.episode_number || 0) || a.title.localeCompare(b.title)));
  const watched = new Set(getWatched());
  const completed = playable.filter(v => watched.has(v.id)).length;
  const next = ordered.find(v => !watched.has(v.id));
  const additions = [...playable].sort((a,b) => getItemActivityAt(b)-getItemActivityAt(a)).slice(0,5);
  const titleCount = subFranchises.length + franchiseSeries.length + franchiseMovies.length;
  const activityOf = (item) => getItemActivityAt(item, allFranchises, allSeries, allVideos);

  const groups = [
    {
      key: "collections",
      label: "Collections",
      items: subFranchises.map((f) => (
        <FranchiseCard
          key={f.id}
          franchise={f}
          itemCount={
            allSeries.filter((s) => s.franchise_id === f.id).length +
            allVideos.filter((v) => v.franchise_id === f.id).length +
            allFranchises.filter((sub) => sub.parent_id === f.id).length
          }
          itemLabel="Titles"
          isUpdated={isRecentlyUpdated(activityOf(f))}
        />
      )),
    },
    {
      key: "series",
      label: "TV Series",
      items: franchiseSeries.map((s) => (
        <SeriesCard key={s.id} series={s} isUpdated={isRecentlyUpdated(activityOf(s))} />
      )),
    },
    {
      key: "movies",
      label: "Movies",
      items: franchiseMovies.map((v) => (
        <VideoCard key={v.id} video={v} isUpdated={isRecentlyUpdated(activityOf(v))} />
      )),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <CollectionHero
        franchise={franchise}
        titleCount={titleCount}
        isUpdated={isRecentlyUpdated(activityOf(franchise))}
        isFavourited={isFavourited}
        onToggleFavourite={handleToggleFavourite}
      />

      <main className="xero-container flex-1 space-y-8 pb-12 pt-8">
        {playable.length > 0 && <section className="rounded-lg border border-border bg-card px-3 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex-1 min-w-[160px] max-w-sm">
              <div className="flex items-center justify-between gap-2 text-xs"><h2 className="font-bold">Collection Progress</h2><span className="text-muted-foreground">{completed}/{playable.length} · {Math.round(completed/playable.length*100)}%</span></div>
              <div role="progressbar" aria-label="Collection progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={playable.length} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width: (completed/playable.length*100)+"%"}} /></div>
            </div>
            {next && <Button size="sm" asChild className="h-8 max-w-full"><Link className="truncate" to={"/watch?id="+next.id}>Watch Next: {next.title}</Link></Button>}
          </div>
          <details className="text-xs"><summary className="cursor-pointer font-semibold text-primary py-1">Viewing order &amp; latest additions</summary>
          <div className="space-y-2 pt-2">
          <div className="flex gap-2"><Button size="sm" variant={order==="collection"?"default":"outline"} onClick={()=>setOrder("collection")}>Collection Order</Button><Button size="sm" variant={order==="release"?"default":"outline"} onClick={()=>setOrder("release")}>Release Order</Button></div>
          <div className="max-h-48 overflow-auto divide-y divide-border">{ordered.map((v,i)=><Link className="flex gap-3 py-1.5 text-xs hover:text-primary" key={v.id} to={"/watch?id="+v.id}><span>{i+1}.</span><span>{seasonMap.get(v.series_id)?.title ? seasonMap.get(v.series_id).title+" · " : ""}{v.title}</span>{watched.has(v.id)&&<span className="ml-auto text-primary">Watched</span>}</Link>)}</div>
          <h3 className="font-bold text-xs">Latest additions</h3><div className="flex flex-wrap gap-3">{additions.map(v=><Link className="text-sm text-primary" key={v.id} to={"/watch?id="+v.id}>{v.title}</Link>)}</div>
          </div></details>
        </section>}
        <GenreChips record={franchise} legacyField="category" />
        {groups.length > 0 ? (
          <section>
            <SectionHeader title="Titles in this Collection" />
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.key}>
                  {groups.length > 1 && (
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</h3>
                  )}
                  <MediaGrid>{group.items}</MediaGrid>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16 text-muted-foreground">No content in this franchise yet.</div>
        )}

        <ReviewSection contentId={franchiseId} contentType="franchise" />
      </main>
      <Footer />
    </div>
  );
}