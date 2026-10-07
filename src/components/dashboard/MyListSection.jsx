import React from "react";
import { Heart } from "lucide-react";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import VideoCard from "@/components/browse/VideoCard";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import EpisodeCard from "@/components/browse/EpisodeCard";
import EpisodeGrid from "@/components/browse/EpisodeGrid";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

const SubHeading = ({ children }) => (
  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{children}</h3>
);

export default function MyListSection({
  favouriteVideos, favouriteSeries, favouriteFranchises, watchlists, watchlistItems, videos, allSeries, isPremium, onDeleteWatchlist,
}) {
  const movies = favouriteVideos.filter((v) => !v.series_id);
  const episodes = favouriteVideos.filter((v) => v.series_id);
  const hasFavourites = favouriteVideos.length + favouriteSeries.length + favouriteFranchises.length > 0;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader title="My Favourites" />
        {!hasFavourites ? (
          <EmptyState icon={Heart} title="No favourites yet" text="Tap the heart on any movie, series or collection to save it here." ctaTo="/" />
        ) : (
          <div className="space-y-8">
            {movies.length > 0 && (
              <div>
                <SubHeading>Movies</SubHeading>
                <MediaGrid>{movies.map((v) => <VideoCard key={v.id} video={v} />)}</MediaGrid>
              </div>
            )}
            {favouriteSeries.length > 0 && (
              <div>
                <SubHeading>TV Series</SubHeading>
                <MediaGrid>{favouriteSeries.map((s) => <SeriesCard key={s.id} series={s} />)}</MediaGrid>
              </div>
            )}
            {favouriteFranchises.length > 0 && (
              <div>
                <SubHeading>Collections</SubHeading>
                <MediaGrid>{favouriteFranchises.map((f) => <FranchiseCard key={f.id} franchise={f} />)}</MediaGrid>
              </div>
            )}
            {episodes.length > 0 && (
              <div>
                <SubHeading>Episodes</SubHeading>
                <EpisodeGrid>{episodes.map((v) => <EpisodeCard key={v.id} video={v} isPremium={isPremium} />)}</EpisodeGrid>
              </div>
            )}
          </div>
        )}
      </section>

      {watchlists.length > 0 && (
        <section>
          <SectionHeader title="My Watchlists" />
          <div className="space-y-5">
            {watchlists.map((wl) => <WatchlistPanel key={wl.id} watchlist={wl} items={watchlistItems.filter((item) => item.watchlist_id === wl.id)} videos={videos} allSeries={allSeries} isPremium={isPremium} onDelete={onDeleteWatchlist} />)}
          </div>
        </section>
      )}
    </div>
  );
}