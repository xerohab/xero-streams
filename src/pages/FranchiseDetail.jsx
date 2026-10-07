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
import { getItemActivityAt, isRecentlyUpdated } from "@/lib/activityUtils";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

export default function FranchiseDetail() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const franchiseId = urlParams.get("id");

  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (franchise) document.title = `${franchise.title} | Xero Streams`;
    return () => { document.title = "Xero Streams"; };
  }, [franchise]);

  const isFavourited = user?.favourite_franchises?.includes(franchiseId) ?? false;
  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(location.pathname + location.search); return; }
    const current = user.favourite_franchises || [];
    const updated = isFavourited ? current.filter((id) => id !== franchiseId) : [...current, franchiseId];
    await base44.auth.updateMe({ favourite_franchises: updated });
    setUser((prev) => ({ ...prev, favourite_franchises: updated }));
  };

  const { data: franchise, isLoading: loadingFranchise } = useQuery({
    queryKey: ["franchise", franchiseId],
    queryFn: async () => {
      const list = await base44.entities.Franchise.filter({ id: franchiseId });
      return list[0];
    },
    enabled: !!franchiseId,
  });

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