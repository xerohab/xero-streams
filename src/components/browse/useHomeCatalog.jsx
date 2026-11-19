import {useProfile} from "@/lib/ProfileContext";
import {allowsKidsContent} from "@/lib/parentalControls";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getCatalogMedia, getItemActivityAt } from "@/lib/activityUtils";
import loadMediaRecords, { mediaCatalogueQuery } from "@/components/browse/loadMediaRecords";

export default function useHomeCatalog() {
  const context = useProfile();
  const profile = context?.activeProfile;
  const pending = Boolean(context?.loading || (context?.user && !profile));
  const kids = Boolean(profile?.is_kids);
  const { data: videos = [], isLoading: loadingVideos } = useQuery({ ...mediaCatalogueQuery(base44, "videos", kids ? profile.id : null, pending), enabled: !pending });
  const { data: series = [], isLoading: loadingSeries } = useQuery({ ...mediaCatalogueQuery(base44, "series", kids ? profile.id : null, pending), enabled: !pending });
  const { data: franchises = [], isLoading: loadingFranchises } = useQuery({ queryKey: ["cinema_catalog", "franchises"], enabled: !pending && !kids, queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000) });
  const { data: user } = useQuery({ queryKey: ["current_user"], queryFn: () => base44.auth.me().catch(() => null), staleTime: 0 });
  const rows = user?.homepage_rows || ["hero", "continue_watching", "latest", "tv", "movies"];
  const safeVideos = videos.filter((v) => !v.is_adult && (!kids||allowsKidsContent(v)));
  const safeSeries = series.filter((s) => !s.is_adult && (!kids||allowsKidsContent(s)));
  const populated = (items) => items.filter((item) => item.type !== "franchise" || item.items > 0).sort((a, b) => b.latestActivityAt - a.latestActivityAt);
  const latest = populated(getCatalogMedia(kids?[]:franchises, safeSeries.map(s=>kids?{...s,franchise_id:null}:s), safeVideos.map(v=>kids?{...v,franchise_id:null}:v)));
  const byActivity = (a, b) => b.latestActivityAt - a.latestActivityAt;
  const movieVideos = safeVideos.filter(v => !v.series_id && !["episode", "book"].includes(v.content_type));
  const movies = movieVideos.map(data => ({ type: "video", data, latestActivityAt: getItemActivityAt(data) })).sort(byActivity);
  const tv = safeSeries.map(data => ({ type: "series", data, latestActivityAt: getItemActivityAt(data, franchises, safeSeries, safeVideos) })).sort(byActivity);
  const movieFranchises = kids?[]:populated(getCatalogMedia(franchises, safeSeries, movieVideos, "video")).filter(item => item.type === "franchise").map(item => ({ ...item, latestActivityAt: getItemActivityAt(item.data, franchises, safeSeries, safeVideos) })).sort(byActivity);
  const tvFranchises = kids?[]:populated(getCatalogMedia(franchises, safeSeries, safeVideos, "series")).filter(item => item.type === "franchise").sort(byActivity);

  // Rotating hero: top-level items from latest activity with suitable landscape artwork.
  // Eligible: standalone Movie, standalone Series, Franchise — never individual Episodes or Books.
  const heroSlides = latest
    .filter((item) => {
      if (item.type === "franchise") return item.data.backdrop_url || item.data.cover_image;
      if (item.type === "series") return item.data.backdrop_url || item.data.cover_image;
      if (item.type === "video") return !item.data.series_id && item.data.content_type !== "episode" && (item.data.backdrop_url || item.data.thumbnail_url);
      return false;
    })
    .slice(0, 5);

  return { user, rows, isLoading: pending || loadingVideos || loadingSeries || loadingFranchises, heroSlides, videos: safeVideos, series: safeSeries, franchises:kids?[]:franchises, latest, tv, movies, movieFranchises, tvFranchises };
}