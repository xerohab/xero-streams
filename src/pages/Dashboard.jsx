import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/browse/Navbar";
import {
  User, Heart, Clock, ShieldCheck, ShieldAlert, LogOut, Loader2, Play, CheckCircle2, Camera, XCircle, Star, TrendingUp, Film, Home, Book, Download as DownloadIcon, Palette, MessageSquare, Plus, Tv, ListVideo, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SeriesCard from "@/components/browse/SeriesCard";
import FranchiseCard from "@/components/browse/FranchiseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  // Use "My Xero" for all UI headings, but keep route as /dashboard
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // 'approved' | 'declined' | 'error'
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { inProgress: continueWatching, completed: watchedHistory } = useContinueWatching();

  const [requestTitle, setRequestTitle] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [requesting, setRequesting] = useState(false);

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

  useEffect(() => {
    if (loadingUser) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [loadingUser]);

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.list()
  });

  const { data: subscriptions = [], refetch: refetchSubscriptions } = useQuery({
    queryKey: ["user_subscriptions", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id }),
    enabled: !!user
  });

  const [subscribingTo, setSubscribingTo] = useState(null);

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

  const activeSub = subscriptions.find(s => {
    if (s.status === 'active') return true;
    const plan = plans.find(p => p.id === s.plan_id);
    return plan?.interval === 'lifetime';
  });
  const activePlan = activeSub ? plans.find(p => p.id === activeSub.plan_id) : null;
  const hasAccess = !!activeSub || user?.role === 'admin';

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
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
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.list()
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list()
  });

  const { data: allFranchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list()
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

  const deleteWatchlist = async (id) => {
    if (confirm("Are you sure you want to delete this watchlist?")) {
      await base44.entities.Watchlist.delete(id);
      refetchWatchlists();
    }
  };

  const handleThemeChange = async (color) => {
    await base44.auth.updateMe({ theme_color: color });
    window.location.reload();
  };

  const handleToggleRow = async (rowId, checked) => {
    const currentRows = user.homepage_rows || ["hero", "continue_watching", "favourites", "tv", "movies"];
    const newRows = checked ? [...currentRows, rowId] : currentRows.filter(r => r !== rowId);
    await base44.auth.updateMe({ homepage_rows: newRows });
    fetchUser();
  };

  const favouriteVideos = videos.filter((v) => user?.favourites?.includes(v.id));
  const favouriteSeries = allSeries.filter((s) => user?.favourite_series?.includes(s.id));
  const favouriteFranchises = allFranchises.filter((f) => user?.favourite_franchises?.includes(f.id));
  const cwVideos = continueWatching
    .map(({ id, progress, currentTime }) => ({ video: videos.find((v) => v.id === id), percent: (progress || 0) / 100, currentTime }))
    .filter((x) => x.video);

  const completedVideos = watchedHistory
    .map(({ id }) => videos.find((v) => v.id === id))
    .filter(Boolean);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestTitle) return;
    setRequesting(true);
    try {
      const payload = {
        user_id: user.id,
        title: requestTitle,
        status: "pending"
      };
      if (requestDesc) {
        payload.description = requestDesc;
      }
      await base44.entities.ContentRequest.create(payload);
      setRequestTitle("");
      setRequestDesc("");
      refetchRequests();
    } catch (err) {
      console.error(err);
      alert("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setRequesting(false);
    }
  };

  const startCamera = async () => {
    setCapturedImage(null);
    setVerifyResult(null);
    setCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const submitVerification = async () => {
    setVerifying(true);
    setVerifyResult(null);
    const res = await base44.functions.invoke('verifyAge', { image_base64: capturedImage });
    const data = res.data;
    if (data.approved) {
      setVerifyResult('approved');
      // Refetch from server to get latest user data including age_verified
      await fetchUser();
    } else {
      setVerifyResult('declined');
    }
    setCapturedImage(null);
    setVerifying(false);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-16 space-y-10">

        {/* Profile Header */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">My Xero</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.full_name || "User"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">{user.role}</Badge>
              {activeSub ? (
                <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {activePlan?.name || "Pro"} Subscriber
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Free User
                </Badge>
              )}
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Age verification & adult links hidden */}

        {/* Content Requests */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Request Content
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              {!hasAccess ? (
                <div className="text-center py-6">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-1">Premium Feature</h3>
                  <p className="text-muted-foreground text-sm mb-4">You need an active subscription to request content.</p>
                  <Button variant="outline" onClick={() => document.getElementById("billing-section")?.scrollIntoView({behavior: "smooth"})}>View Plans</Button>
                </div>
              ) : (
                <>
                  <form onSubmit={submitRequest} className="space-y-4 mb-6 border-b border-border pb-6">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Movie / TV Series Title *</label>
                      <Input value={requestTitle} onChange={e => setRequestTitle(e.target.value)} required placeholder="e.g. The Matrix" className="bg-secondary" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Additional Details (Optional)</label>
                      <Textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} placeholder="e.g. Any specific season?" className="bg-secondary" />
                    </div>
                    <Button type="submit" disabled={requesting || !requestTitle}>
                      {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Submit Request
                    </Button>
                  </form>

                  <div>
                    <h3 className="font-semibold mb-3">My Previous Requests</h3>
                    {myRequests.length === 0 ? (
                      <p className="text-muted-foreground text-sm">You haven't requested any content yet.</p>
                    ) : (
                      <div className="grid gap-3">
                        {myRequests.map(req => (
                          <div key={req.id} className="flex items-center justify-between bg-secondary p-3 rounded-lg">
                            <div>
                              <p className="font-semibold">{req.title}</p>
                            </div>
                            <Badge variant={req.status === 'fulfilled' ? 'default' : 'secondary'} className={req.status === 'fulfilled' ? 'bg-green-600' : ''}>
                              {req.status === 'fulfilled' ? 'Available Now' : 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customisation */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Homepage Customisation
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Theme Color</h3>
                <div className="flex gap-3">
                  {[
                    { id: 'red', class: 'bg-red-600' },
                    { id: 'blue', class: 'bg-blue-600' },
                    { id: 'green', class: 'bg-green-600' },
                    { id: 'purple', class: 'bg-purple-600' },
                    { id: 'orange', class: 'bg-orange-500' }
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-10 h-10 rounded-full ${theme.class} transition-transform ${user.theme_color === theme.id || (!user.theme_color && theme.id === 'red') ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-3">Content to Display on Homepage</h3>
                <div className="space-y-3">
                  {[
                    { id: "hero", label: "Hero Banner (Featured)" },
                    { id: "continue_watching", label: "Continue Watching" },
                    { id: "favourites", label: "My Favourites" },
                    { id: "tv", label: "TV Series" },
                    { id: "movies", label: "Movies" }
                  ].map(row => {
                    const isChecked = (user.homepage_rows || ["hero", "continue_watching", "favourites", "tv", "movies"]).includes(row.id);
                    return (
                      <div key={row.id} className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id={`row-${row.id}`}
                          className="w-4 h-4 accent-primary"
                          checked={isChecked}
                          onChange={(e) => handleToggleRow(row.id, e.target.checked)}
                        />
                        <label htmlFor={`row-${row.id}`} className="text-sm cursor-pointer">{row.label}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Downloads */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <DownloadIcon className="w-5 h-5 text-primary" /> My Downloads
          </h2>
          
          {(downloadLogs.length === 0 && bookPurchases.length === 0 && videoPurchases.length === 0) ? (
            <div className="bg-secondary border border-border rounded-xl p-8 text-center">
              <DownloadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No Downloads Yet</h3>
              <p className="text-muted-foreground text-sm">Content you download across the site will appear here.</p>
              <Link to="/"><Button className="mt-4" variant="outline">Browse Content</Button></Link>
            </div>
          ) : (
            <div className="space-y-6">
              {downloadLogs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Download History</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {downloadLogs.map(log => {
                      const video = (log.content_type === "movie" || log.content_type === "episode") ? videos.find(v => v.id === log.content_id) : null;
                      return (
                        <div key={log.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {video?.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <DownloadIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-sm line-clamp-1">{log.content_title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{log.content_type} · {new Date(log.created_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(bookPurchases.length > 0 || videoPurchases.length > 0) && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Book className="w-4 h-4" /> Purchased Content</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {bookPurchases.map(p => {
                      const book = books.find(b => b.id === p.book_id);
                      if (!book) return null;
                      return (
                        <div key={p.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Book className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="font-bold text-sm line-clamp-1">{book.title}</p>
                              <p className="text-xs text-muted-foreground">Book</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => window.open(book.file_url, '_blank')}>Download</Button>
                        </div>
                      );
                    })}
                    {videoPurchases.map(p => {
                      const video = videos.find(v => v.id === p.video_id);
                      if (!video) return null;
                      return (
                        <div key={p.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Film className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="font-bold text-sm line-clamp-1">{video.title}</p>
                              <p className="text-xs text-muted-foreground">Video</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => window.open(video.download_url, '_blank')}>Download</Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: "Browse All", icon: Home, to: "/" },
            { label: "Movies", icon: Film, to: "/?tab=movies" },
            { label: "TV Series", icon: TrendingUp, to: "/?tab=tv" },
            { label: "Books", icon: Book, to: "/books" },
          ].map(({ label, icon: Icon, to }) => (
            <Link key={label} to={to}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="py-4 flex flex-col items-center gap-2 text-center">
                  <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Continue Watching */}
        {cwVideos.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Continue Watching
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cwVideos.map(({ video, percent, currentTime }) => (
                <Link key={video.id} to={`/watch?id=${video.id}`}>
                  <div className="relative rounded-lg overflow-hidden bg-secondary group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    <div className="aspect-video">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Play className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-4 h-4 fill-current text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-primary" style={{ width: `${Math.round(percent * 100)}%` }} />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold text-foreground line-clamp-2">{video.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatTime(currentTime)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Watchlists */}
        {watchlists.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ListVideo className="w-5 h-5 text-primary" /> My Watchlists
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {watchlists.map((wl) => {
                const items = watchlistItems.filter((i) => i.watchlist_id === wl.id);
                return (
                  <Card key={wl.id} className="bg-card border-border overflow-hidden">
                    <CardHeader className="bg-secondary/50 pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base">{wl.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteWatchlist(wl.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items in this watchlist yet.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {items.slice(0, 3).map((item) => {
                            const video = item.video_id ? videos.find((v) => v.id === item.video_id) : null;
                            if (!video) return null;
                            return (
                              <Link key={item.id} to={`/watch?id=${video.id}`}>
                                <div className="relative aspect-video rounded-md overflow-hidden bg-secondary group">
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-muted-foreground" /></div>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                          {items.length > 3 && (
                            <div className="relative aspect-video rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                              <span className="text-sm font-semibold text-muted-foreground">+{items.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Favourites */}
        <div className="space-y-8">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" /> My Favourites
          </h2>
          
          {(favouriteVideos.length === 0 && favouriteSeries.length === 0 && favouriteFranchises.length === 0) ? (
            <p className="text-muted-foreground text-sm">No favourites yet. Click the heart icon on any video, series, or franchise to save it here.</p>
          ) : (
            <>
              {favouriteVideos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Film className="w-4 h-4" /> Movies & Episodes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {favouriteVideos.map((video) => (
                      <Link key={video.id} to={`/watch?id=${video.id}`}>
                        <div className="relative rounded-lg overflow-hidden bg-secondary group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                          <div className="aspect-video">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Play className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <Play className="w-4 h-4 fill-current text-primary-foreground ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-foreground line-clamp-2">{video.title}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {favouriteSeries.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Tv className="w-4 h-4" /> TV Series</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {favouriteSeries.map(s => (
                      <SeriesCard key={s.id} series={s} />
                    ))}
                  </div>
                </div>
              )}

              {favouriteFranchises.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Film className="w-4 h-4" /> Franchises / Collections</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {favouriteFranchises.map(f => (
                      <FranchiseCard key={f.id} franchise={f} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Watched / Completed */}
        {completedVideos.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" /> Watched
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {completedVideos.slice(0, 8).map((video) => (
                <Link key={video.id} to={`/watch?id=${video.id}`}>
                  <div className="relative rounded-lg overflow-hidden bg-secondary group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    <div className="aspect-video">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Play className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-4 h-4 fill-current text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow" />
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold text-foreground line-clamp-2">{video.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Billing */}
        <div id="billing-section">
          <h2 className="text-lg font-bold text-foreground mb-4">Billing & Subscriptions</h2>
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-6">
              {activeSub ? (
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">Current Plan: {activePlan?.name || "Unknown"}</h3>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pro User</Badge>
                    </div>
                    <p className="text-muted-foreground">You are subscribed and have full access to premium features.</p>
                  </div>
                  <Button variant="destructive" onClick={() => handleCancelSub(activeSub.id)}>Cancel Subscription</Button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">Choose a Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.filter(p => p.is_active).map(plan => (
                      <div key={plan.id} className="border border-border rounded-lg p-5 flex flex-col">
                        <h4 className="text-lg font-bold">{plan.name}</h4>
                        <p className="text-2xl font-black text-primary my-2">${plan.price}<span className="text-sm text-muted-foreground font-normal">/{plan.interval}</span></p>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">{plan.description}</p>
                        <Button 
                          className="w-full" 
                          onClick={() => handleSubscribe(plan)}
                          disabled={subscribingTo === plan.id}
                        >
                          {subscribingTo === plan.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Subscribe
                        </Button>
                      </div>
                    ))}
                    {plans.filter(p => p.is_active).length === 0 && <p className="text-muted-foreground">No active plans available.</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card border-border text-center">
            <CardContent className="py-5">
              <p className="text-3xl font-black text-primary">{favouriteVideos.length + favouriteSeries.length + favouriteFranchises.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Favourites</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border text-center">
            <CardContent className="py-5">
              <p className="text-3xl font-black text-primary">{cwVideos.length}</p>
              <p className="text-sm text-muted-foreground mt-1">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border text-center">
            <CardContent className="py-5">
              <p className="text-3xl font-black text-primary">{completedVideos.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Watched</p>
            </CardContent>
          </Card>
          {/* Age 18+ stat hidden */}
        </div>

      </div>
    </div>
  );
}