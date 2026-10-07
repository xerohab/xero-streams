import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function WatchlistButton({ videoId, seriesId, variant = "outline", className = "", label = "Add to Watchlist" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: watchlists = [], isLoading: isLoadingWatchlists } = useQuery({
    queryKey: ["watchlists", user?.id],
    queryFn: () => base44.entities.Watchlist.filter({ user_id: user.id }),
    enabled: !!user,
  });

  const { data: watchlistItems = [] } = useQuery({
    queryKey: ["watchlistItems"],
    queryFn: () => base44.entities.WatchlistItem.list(),
    enabled: !!user && isOpen,
  });

  const createWatchlistMutation = useMutation({
    mutationFn: (name) => base44.entities.Watchlist.create({ user_id: user.id, name }),
    onSuccess: (newWatchlist) => {
      queryClient.invalidateQueries(["watchlists"]);
      setNewWatchlistName("");
      // Add current video to the new watchlist automatically
      toggleItemMutation.mutate({ watchlistId: newWatchlist.id, action: "add" });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ watchlistId, action, itemId }) => {
      if (action === "add") {
        return base44.entities.WatchlistItem.create({
          watchlist_id: watchlistId,
          video_id: videoId || null,
          series_id: seriesId || null,
        });
      } else {
        return base44.entities.WatchlistItem.delete(itemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["watchlistItems"]);
    },
  });

  if (!user) {
    return (
      <Button
        variant={variant}
        className={className}
        onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}
      >
        <ListPlus className="w-4 h-4 mr-2" />
        {label}
      </Button>
    );
  }

  const handleToggle = (watchlist) => {
    const existingItem = watchlistItems.find(
      (item) => item.watchlist_id === watchlist.id &&
                (videoId ? item.video_id === videoId : item.series_id === seriesId)
    );

    if (existingItem) {
      toggleItemMutation.mutate({ action: "remove", itemId: existingItem.id });
    } else {
      toggleItemMutation.mutate({ watchlistId: watchlist.id, action: "add" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <ListPlus className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {isLoadingWatchlists ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : watchlists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              You don't have any watchlists yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {watchlists.map((watchlist) => {
                const isAdded = watchlistItems.some(
                  (item) => item.watchlist_id === watchlist.id &&
                            (videoId ? item.video_id === videoId : item.series_id === seriesId)
                );
                return (
                  <Button
                    key={watchlist.id}
                    variant="outline"
                    className="w-full justify-between font-normal"
                    onClick={() => handleToggle(watchlist)}
                    disabled={toggleItemMutation.isPending}
                  >
                    {watchlist.name}
                    {isAdded && <Check className="w-4 h-4 text-primary" />}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-border">
            <Input
              placeholder="New watchlist name..."
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              className="flex-1"
            />
            <Button
              disabled={!newWatchlistName.trim() || createWatchlistMutation.isPending}
              onClick={() => createWatchlistMutation.mutate(newWatchlistName.trim())}
            >
              {createWatchlistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}