import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Film, Tv, Loader2, Play, Heart, Download as DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/browse/Navbar";
import DetailHero from "@/components/browse/DetailHero";
import SeasonSelect from "@/components/browse/SeasonSelect";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import SeriesCard from "@/components/browse/SeriesCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import StatusBadge from "@/components/browse/StatusBadge";
import ReviewSection from "@/components/browse/ReviewSection";
import { usePremiumModal } from "@/lib/PremiumModalContext";
import Footer from "@/components/browse/Footer";
import WatchlistButton from "@/components/browse/WatchlistButton";
import SeriesDownloadButton from "@/components/browse/SeriesDownloadButton";
import { getAll } from "@/hooks/useContinueWatching";
import { getItemActivityAt, isRecentlyUpdated } from "@/lib/activityUtils";

const OUTLINE_BTN = "xero-action px-5";

export default function SeriesDetail() {
  const [searchParams] = useSearchParams();
  const seriesId = searchParams.get("id");
  const from = searchParams.get("from") || "/";

  const [user, setUser] = useState(null);
  const { open: openPremium } = usePremiumModal();
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (series) document.title = `${series.title} | Xero Streams`;
    return () => { document.title = "Xero Streams"; };
  }, [series]);

  const isFavourited = user?.favourite_series?.includes(seriesId) ?? false;
  const handleToggleFavourite = async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
    const current = user.favourite_series || [];
    const updated = isFavourited ? current.filter((id) => id !== seriesId) : [...current, seriesId];
    await base44.auth.updateMe({ favourite_series: updated });
    setUser((prev) => ({ ...prev, favourite_series: updated }));
  };

  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: async () => {
      const list = await base44.entities.Series.filter({ id: seriesId });
      return list[0];
    },
    enabled: !!seriesId,
  });

  const { data: episodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ["episodes", seriesId],
    queryFn: () => base44.entities.Video.filter({ series_id: seriesId }, "sort_order", 2000),
    enabled: !!seriesId,
  });

  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ["series-images", seriesId],
    queryFn: () => base44.entities.Image.filter({ series_id: seriesId }, "-created_date"),
    enabled: !!seriesId,
  });

  const { data: premiumSubs = [] } = useQuery({
    queryKey: ["active_subscription", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" }),
    enabled: !!user
  });
  const { data: franchise } = useQuery({ queryKey: ["franchise", series?.franchise_id], queryFn: async () => { const res = await base44.entities.Franchise.filter({id: series.franchise_id}); return res[0]; }, enabled: !!series?.franchise_id });

  // Seasons = the sibling series inside the same collection
  const { data: siblings = [] } = useQuery({
    queryKey: ["series_siblings", series?.franchise_id],
    queryFn: () => base44.entities.Series.filter({ franchise_id: series.franchise_id }, "sort_order", 500),
    enabled: !!series?.franchise_id,
  });

  const { data: recentSeries = [] } = useQuery({
    queryKey: ["series_recommendations"],
    queryFn: () => base44.entities.Series.filter({ is_adult: false }, "-updated_date", 60),
  });

  const isPremium = user?.role === "admin" || premiumSubs.length > 0;

  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
    return a.title.localeCompare(b.title);
  });

  const seasons = [...siblings].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title, undefined, { numeric: true })
  );

  const recommendations = recentSeries
    .filter((s) => s.id !== seriesId && (!series?.franchise_id || s.franchise_id !== series.franchise_id))
    .sort((a, b) => Number(b.category === series?.category) - Number(a.category === series?.category))
    .slice(0, 14);

  if (loadingSeries || loadingEpisodes || loadingImages) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-foreground mb-2">Series not found</h2>
          <Link to={from}><Button variant="secondary">Back to Browse</Button></Link>
        </div>
      </div>
    );
  }

  const firstPlayable = sortedEpisodes.find((ep) => !ep.coming_soon && ep.video_url);
  const resumeEntry = getAll().find((entry) => sortedEpisodes.some((ep) => ep.id === entry.id && ep.video_url && !ep.coming_soon));
  const playEpisode = resumeEntry ? sortedEpisodes.find((ep) => ep.id === resumeEntry.id) : firstPlayable;
  const isUpdated = isRecentlyUpdated(getItemActivityAt(series, [], [series], episodes));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <DetailHero
        image={series.cover_image}
        backdrop={series.backdrop_url}
        title={series.title}
        FallbackIcon={Tv}
        backTo={from}
        eyebrow={<>
          <StatusBadge status="TV Series" />
          {isUpdated && <StatusBadge status="UPDATED" />}
          {franchise && <Link to={`/franchise?id=${franchise.id}`} className="text-xs font-semibold text-primary hover:underline">{franchise.title} Collection</Link>}
        </>}
        meta={
          <>
            {series.release_year && <span>{series.release_year}</span>}
            {series.category && <span className="capitalize">{series.category}</span>}
            {series.is_adult && <StatusBadge status="18+" />}
            <span>{sortedEpisodes.length} Episode{sortedEpisodes.length !== 1 && "s"}</span>
          </>
        }
        description={series.description}
      >
        {playEpisode && (
          <Button asChild className="h-11 gap-2 rounded-lg px-6 font-bold">
            <Link to={`/watch?id=${playEpisode.id}${resumeEntry ? `&t=${Math.floor(resumeEntry.currentTime)}` : ""}`}>
              <Play className="h-4 w-4 fill-current" />{resumeEntry ? "Resume" : "Watch Now"}
            </Link>
          </Button>
        )}
        <WatchlistButton videoId={null} seriesId={series.id} variant="outline" className={OUTLINE_BTN} label="My List" />
        {firstPlayable && <SeriesDownloadButton series={series} isPremium={isPremium} onViewPlans={openPremium} />}
        <Button
          variant={isFavourited ? "default" : "outline"}
          className={isFavourited ? "gap-2 rounded-full h-11 px-6" : OUTLINE_BTN}
          onClick={handleToggleFavourite}
        >
          <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
          {isFavourited ? "Favourited" : "Favourite Series"}
        </Button>
      </DetailHero>

      <main className="xero-container flex-1 space-y-8 pb-12 pt-6">
        {seasons.length > 1 && <section className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card/40 p-3"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Season</h2><SeasonSelect currentId={seriesId} seasons={seasons} /></section>}
        {sortedEpisodes.length > 0 ? (
          <section>
            <SectionHeader
              title="Episodes"
              subtitle={`${sortedEpisodes.length} episode${sortedEpisodes.length !== 1 ? "s" : ""}`}
            />
            {sortedEpisodes.some((ep) => !ep.coming_soon && ep.video_url) && (
              <p className="mb-5 flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground">
                <DownloadIcon className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  Downloading is available for premium members. Hover over an episode to save it for offline viewing.
                  {!isPremium && (
                    <button type="button" onClick={openPremium} className="ml-2 font-bold text-primary underline hover:text-primary/80">
                      View plans
                    </button>
                  )}
                </span>
              </p>
            )}
            <EpisodeGrid>
              {sortedEpisodes.map((ep) => (
                <EpisodeCard key={ep.id} video={ep} isPremium={isPremium} />
              ))}
            </EpisodeGrid>
          </section>
        ) : (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <Film className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-bold">No Episodes Yet</h3>
            <p className="text-muted-foreground">Check back later for new episodes.</p>
          </div>
        )}

        {images.length > 0 && (
          <section>
            <SectionHeader title="Gallery" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-video min-w-[260px] flex-none snap-start overflow-hidden rounded-lg ring-1 ring-border md:min-w-[360px]">
                  <img src={img.image_url} alt={img.title || "Gallery Image"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onContextMenu={(e) => e.preventDefault()} />
                  {img.title && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <p className="px-4 text-center font-bold text-white">{img.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section>
            <SectionHeader title="More Like This" />
            <MediaGrid>
              {recommendations.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </MediaGrid>
          </section>
        )}

        <ReviewSection contentId={seriesId} contentType="series" />
      </main>
      <Footer />
    </div>
  );
}