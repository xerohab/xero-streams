import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

export default function MyReviewsSection({ userId, videos, allSeries, allFranchises }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["my_reviews", userId],
    queryFn: () => base44.entities.Review.filter({ user_id: userId }, "-created_date", 100),
  });

  const describe = (review) => {
    if (review.content_type === "series") {
      const s = allSeries.find((x) => x.id === review.content_id);
      return { title: s?.title, to: `/series?id=${review.content_id}`, label: "Series" };
    }
    if (review.content_type === "franchise") {
      const f = allFranchises.find((x) => x.id === review.content_id);
      return { title: f?.title, to: `/franchise?id=${review.content_id}`, label: "Collection" };
    }
    const v = videos.find((x) => x.id === review.content_id);
    return { title: v?.title, to: v?.series_id ? `/watch?id=${review.content_id}` : `/movie?id=${review.content_id}`, label: v?.series_id ? "Episode" : "Movie" };
  };

  return (
    <section>
      <SectionHeader title="My Reviews" />
      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" text="Rate a movie, series or collection and your reviews will show up here." ctaTo="/" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {reviews.map((review) => {
            const { title, to, label } = describe(review);
            return (
              <div key={review.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <Link to={to} className="line-clamp-1 text-sm font-bold text-foreground hover:text-primary">{title || "Unavailable title"}</Link>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                </div>
                <div className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
                {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}