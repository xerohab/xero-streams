import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getCatalogMedia } from "@/lib/activityUtils";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

export default function useHomeCatalog() {
  const { data: videos = [], isLoading: loadingVideos } = useQuery({ queryKey: ["cinema_catalog", "videos"], queryFn: () => loadMediaRecords(base44.entities.Video) });
  const { data: series = [], isLoading: loadingSeries } = useQuery({ queryKey: ["cinema_catalog", "series"], queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000) });
  const { data: franchises = [], isLoading: loadingFranchises } = useQuery({ queryKey: ["cinema_catalog", "franchises"], queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000) });
  const { data: user } = useQuery({ queryKey: ["current_user"], queryFn: () => base44.auth.me().catch(() => null), staleTime: 0 });
  const rows = user?.homepage_rows || ["hero", "continue_watching", "latest", "tv", "movies"];
  const safeVideos = videos.filter((v) => !v.is_adult);
  const safeSeries = series.filter((s) => !s.is_adult);
  const populated = (items) => items.filter((item) => item.type !== "franchise" || item.items > 0).sort((a, b) => b.latestActivityAt - a.latestActivityAt);
  const latest = populated(getCatalogMedia(franchises, safeSeries, safeVideos));
  const franchiseFirst = (a, b) => Number(b.type === "franchise") - Number(a.type === "franchise") || b.latestActivityAt - a.latestActivityAt;
  const tv = populated(getCatalogMedia(franchises, safeSeries, safeVideos, "series")).sort(franchiseFirst);
  const movies = populated(getCatalogMedia(franchises, safeSeries, safeVideos, "video")).sort(franchiseFirst);
  const featured = safeVideos.filter((video) => video.is_featured);
  return { user, rows, isLoading: loadingVideos || loadingSeries || loadingFranchises, heroVideos: featured.length ? featured.slice(0, 5) : safeVideos.slice(0, 1), videos: safeVideos, series: safeSeries, franchises, latest, tv, movies };
}