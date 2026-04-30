import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, User } from "lucide-react";
import toast from "react-hot-toast";

export default function ReviewSection({ contentId, contentType }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: () => base44.auth.me().catch(() => null)
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", contentId],
    queryFn: () => base44.entities.Review.filter({ content_id: contentId }, "-created_date")
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users_for_reviews", reviews.map(r => r.user_id)],
    queryFn: async () => {
      if (reviews.length === 0) return [];
      // We can only fetch other users if admin, but reviews typically need names.
      // Since normal users can't list all users, we might just show "User" or we can fetch if allowed.
      // Wait, User RLS doesn't allow reading other users unless admin. We will just use a generic name or "User".
      return [];
    },
    enabled: reviews.length > 0
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      await base44.entities.Review.create({
        user_id: user.id,
        content_id: contentId,
        content_type: contentType,
        rating,
        comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["reviews", contentId]);
      setComment("");
      setRating(5);
      toast.success("Review submitted!");
    },
    onError: (e) => toast.error(e.message || "Failed to submit review")
  });

  const deleteReview = useMutation({
    mutationFn: (id) => base44.entities.Review.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["reviews", contentId]);
      toast.success("Review deleted");
    }
  });

  const renderStars = (ratingValue, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-5 h-5 ${star <= ratingValue ? "fill-primary text-primary" : "text-muted-foreground"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && setRating(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold text-foreground mb-6">User Reviews</h3>
      
      {user ? (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h4 className="font-semibold mb-4">Write a Review</h4>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground block mb-2">Rating</span>
            {renderStars(rating, true)}
          </div>
          <Textarea 
            value={comment} 
            onChange={e => setComment(e.target.value)} 
            placeholder="Share your thoughts..." 
            className="mb-4 bg-secondary border-border" 
          />
          <Button 
            onClick={() => submitReview.mutate()} 
            disabled={submitReview.isPending || !comment.trim()}
          >
            {submitReview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Review
          </Button>
        </div>
      ) : (
        <div className="bg-secondary rounded-xl p-6 mb-8 text-center">
          <p className="text-muted-foreground">Please sign in to leave a review.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-secondary/50 rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{review.user_id === user?.id ? "You" : "User"}</span>
                    </div>
                    <div className="mt-1">{renderStars(review.rating)}</div>
                  </div>
                </div>
                {(user?.role === 'admin' || user?.id === review.user_id) && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => deleteReview.mutate(review.id)}>
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-foreground text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}