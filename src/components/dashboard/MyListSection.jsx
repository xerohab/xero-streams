import React from "react";
import { Link } from "react-router-dom";
import { Heart, ListVideo, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  favouriteVideos, favouriteSeries, favouriteFranchises, watchlists, watchlistItems, videos, isPremium, onDeleteWatchlist,
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {watchlists.map((wl) => {
              const items = watchlistItems.filter((i) => i.watchlist_id === wl.id);
              return (
                <div key={wl.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <ListVideo className="h-4 w-4 text-primary" /> {wl.name}
                    </h4>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDeleteWatchlist(wl.id)} aria-label="Delete watchlist">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items in this watchlist yet.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {items.slice(0, 3).map((item) => {
                          const video = item.video_id ? videos.find((v) => v.id === item.video_id) : null;
                          if (!video) return null;
                          return (
                            <Link key={item.id} to={`/watch?id=${video.id}`} className="group relative aspect-video overflow-hidden rounded-md bg-secondary ring-1 ring-border hover:ring-primary/70">
                              {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center"><Play className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                            </Link>
                          );
                        })}
                        {items.length > 3 && (
                          <div className="flex aspect-video items-center justify-center rounded-md bg-secondary">
                            <span className="text-sm font-semibold text-muted-foreground">+{items.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}