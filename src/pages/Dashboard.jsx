import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Play, Heart, Download as DownloadIcon, Book, Clock, Star, MessageSquare, Crown, Settings } from "lucide-react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ContinueSection from "@/components/dashboard/ContinueSection";
import MyListSection from "@/components/dashboard/MyListSection";
import DownloadsSection from "@/components/dashboard/DownloadsSection";
import MyBooksSection from "@/components/dashboard/MyBooksSection";
import HistorySection from "@/components/dashboard/HistorySection";
import MyReviewsSection from "@/components/dashboard/MyReviewsSection";
import RequestsSection from "@/components/dashboard/RequestsSection";
import SubscriptionSection from "@/components/dashboard/SubscriptionSection";
import SettingsSection from "@/components/dashboard/SettingsSection";
import loadMediaRecords from "@/components/browse/loadMediaRecords";

const TABS = [
  { id: "continue", label: "Continue Watching", icon: Play },
  { id: "list", label: "My List", icon: Heart },
  { id: "downloads", label: "Downloads", icon: DownloadIcon },
  { id: "books", label: "My Books", icon: Book },
  { id: "history", label: "History", icon: Clock },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "requests", label: "Requests", icon: MessageSquare },
  { id: "subscription", label: "Subscription", icon: Crown },
  { id: "settings", label: "Settings", icon: Settings },
];

// Older links used #billing-section
const HASH_TO_TAB = { "billing-section": "subscription" };
const tabFromHash = (hash) => {
  const key = hash.replace("#", "");
  const id = HASH_TO_TAB[key] || key;
  return TABS.some((t) => t.id === id) ? id : "continue";
};

function useContinueWatching() {
  const [data, setData] = useState({ inProgress: [], completed: [] });
  useEffect(() => {
    const read = () => {
      try {
        const inProgress = (JSON.parse(localStorage.getItem("xero_continue_watching")) || [])
          .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        const completed = (JSON.parse(localStorage.getItem("xero_watched")) || []);
        return { inProgress, completed: completed.map((id) => ({ id })) };
      } catch {
        return { inProgress: [], completed: [] };
      }
    };
    setData(read());
    const handler = () => setData(read());
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);
    window.addEventListener("xero-progress-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
      window.removeEventListener("xero-progress-updated", handler);
    };
  }, []);
  return data;
}

export default function Dashboard() {
  // "My Xero" is the user-facing name; the route stays /dashboard
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState(null);

  // The active section lives in the URL hash so deep links like /dashboard#downloads work
  const activeTab = tabFromHash(location.hash);
  const changeTab = (id) => navigate({ hash: `#${id}` }, { replace: true });

  const { inProgress: continueWatching, completed: watchedHistory } = useContinueWatching();

  const fetchUser = () =>
    base44.auth.me().then((u) => {
      setUser(u);
      setLoadingUser(false);
      if (!u) base44.auth.redirectToLogin("/dashboard");
    }).catch(() => {
      setLoadingUser(false);
      base44.auth.redirectToLogin("/dashboard");
    });

  useEffect(() => { fetchUser(); }, []);

  // Refresh user data (favourites etc.) when the tab regains focus
  useEffect(() => {
    const onFocus = () => { if (user) fetchUser(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.list()
  });

  const { data: subscriptions = [], refetch: refetchSubscriptions } = useQuery({
    queryKey: ["user_subscriptions", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["cinema_catalog", "videos"],
    queryFn: () => loadMediaRecords(base44.entities.Video),
    enabled: !!user,
  });

  const { data: bookPurchases = [] } = useQuery({
    queryKey: ["book_purchases", user?.id],
    queryFn: () => base44.entities.BookPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: videoPurchases = [] } = useQuery({
    queryKey: ["video_purchases", user?.id],
    queryFn: () => base44.entities.VideoPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: downloadLogs = [] } = useQuery({
    queryKey: ["download_logs", user?.id],
    queryFn: () => base44.entities.DownloadLog.filter({ user_id: user.id }, "-created_date"),
    enabled: !!user
  });

  const { data: books = [] } = useQuery({
    queryKey: ["dashboard_books"],
    queryFn: () => base44.entities.Book.list()
  });

  const { data: authors = [] } = useQuery({
    queryKey: ["book_authors"],
    queryFn: () => base44.entities.BookAuthor.list()
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ["cinema_catalog", "series"],
    queryFn: () => loadMediaRecords(base44.entities.Series, "-created_date", 1000)
  });

  const { data: allFranchises = [] } = useQuery({
    queryKey: ["cinema_catalog", "franchises"],
    queryFn: () => loadMediaRecords(base44.entities.Franchise, "-created_date", 1000)
  });

  const { data: myRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["my_requests", user?.id],
    queryFn: () => base44.entities.ContentRequest.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: watchlists = [], refetch: refetchWatchlists } = useQuery({
    queryKey: ["watchlists", user?.id],
    queryFn: () => base44.entities.Watchlist.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: watchlistItems = [] } = useQuery({
    queryKey: ["watchlistItems", user?.id],
    queryFn: () => base44.entities.WatchlistItem.list(),
    enabled: !!user
  });

  const handleSubscribe = async (plan) => {
    if (!user) return;
    setSubscribingTo(plan.id);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { 
        amount: plan.price,
        return_url: window.location.origin + "/callback?success=true",
        cancel_url: window.location.origin + "/callback?cancelled=true"
      });
      if (res.data?.approvalUrl) {
        localStorage.setItem("pending_plan_purchase", JSON.stringify({ plan_id: plan.id }));
        window.location.href = res.data.approvalUrl;
      } else {
        throw new Error(res.data?.error || "Failed to start checkout");
      }
    } catch (err) {
      console.error(err);
      setSubscribingTo(null);
    }
  };

  const handleCancelSub = async (subId) => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      await base44.entities.UserSubscription.update(subId, { status: "cancelled" });
      refetchSubscriptions();
    }
  };

  const deleteWatchlist = async (id) => {
    if (confirm("Are you sure you want to delete this watchlist?")) {
      await base44.entities.Watchlist.delete(id);
      refetchWatchlists();
    }
  };

  const handleToggleRow = async (rowId, checked) => {
    const currentRows = user.homepage_rows || ["hero", "continue_watching", "latest", "tv", "movies"];
    const newRows = checked ? [...currentRows, rowId] : currentRows.filter(r => r !== rowId);
    await base44.auth.updateMe({ homepage_rows: newRows });
    fetchUser();
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const activeSub = subscriptions.find(s => {
    if (s.status === 'active') return true;
    const plan = plans.find(p => p.id === s.plan_id);
    return plan?.interval === 'lifetime';
  });
  const activePlan = activeSub ? plans.find(p => p.id === activeSub.plan_id) : null;
  const hasAccess = !!activeSub || user?.role === 'admin';

  const favouriteVideos = videos.filter((v) => user?.favourites?.includes(v.id));
  const favouriteSeries = allSeries.filter((s) => user?.favourite_series?.includes(s.id));
  const favouriteFranchises = allFranchises.filter((f) => user?.favourite_franchises?.includes(f.id));
  const cwVideos = continueWatching
    .map(({ id, progress, currentTime }) => ({ video: videos.find((v) => v.id === id), percent: (progress || 0) / 100, currentTime }))
    .filter((x) => x.video);
  const completedVideos = watchedHistory
    .map(({ id }) => videos.find((v) => v.id === id))
    .filter(Boolean);

  const stats = [
    { label: "Favourites", value: favouriteVideos.length + favouriteSeries.length + favouriteFranchises.length },
    { label: "In Progress", value: cwVideos.length },
    { label: "Watched", value: completedVideos.length },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="xero-container flex-1 space-y-6 pb-16 pt-24">
        <DashboardHeader user={user} activeSub={activeSub} activePlan={activePlan} stats={stats} />
        <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <DashboardNav tabs={TABS} active={activeTab} onChange={changeTab} />
          <main className="min-w-0 rounded-lg border border-border/60 bg-card/40 p-4 md:p-5">
        {activeTab === "continue" && <ContinueSection items={cwVideos} isPremium={hasAccess} />}
        {activeTab === "list" && (
          <MyListSection
            favouriteVideos={favouriteVideos}
            favouriteSeries={favouriteSeries}
            favouriteFranchises={favouriteFranchises}
            watchlists={watchlists}
            watchlistItems={watchlistItems}
            videos={videos}
            allSeries={allSeries}
            isPremium={hasAccess}
            onDeleteWatchlist={deleteWatchlist}
          />
        )}
        {activeTab === "downloads" && <DownloadsSection downloadLogs={downloadLogs} videoPurchases={videoPurchases} videos={videos} />}
        {activeTab === "books" && <MyBooksSection bookPurchases={bookPurchases} books={books} authors={authors} />}
        {activeTab === "history" && <HistorySection completedVideos={completedVideos} isPremium={hasAccess} />}
        {activeTab === "reviews" && <MyReviewsSection userId={user.id} videos={videos} allSeries={allSeries} allFranchises={allFranchises} />}
        {activeTab === "requests" && (
          <RequestsSection
            userId={user.id}
            hasAccess={hasAccess}
            requests={myRequests}
            onChanged={refetchRequests}
            onViewPlans={() => changeTab("subscription")}
          />
        )}
        {activeTab === "subscription" && (
          <SubscriptionSection
            activeSub={activeSub}
            activePlan={activePlan}
            plans={plans}
            subscribingTo={subscribingTo}
            onSubscribe={handleSubscribe}
            onCancel={handleCancelSub}
          />
        )}
        {activeTab === "settings" && <SettingsSection user={user} onToggleRow={handleToggleRow} />}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}