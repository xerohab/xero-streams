import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/browse/Navbar";
import {
  User, Heart, Clock, ShieldCheck, ShieldAlert, LogOut, Loader2, Play, CheckCircle2, Camera, XCircle, Star, TrendingUp, Film, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useContinueWatching() {
  const raw = localStorage.getItem("xero_progress");
  if (!raw) return { inProgress: [], completed: [] };
  try {
    const obj = JSON.parse(raw);
    const all = Object.entries(obj)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      inProgress: all.filter((x) => x.percent < 0.95),
      completed: all.filter((x) => x.percent >= 0.95),
    };
  } catch {
    return { inProgress: [], completed: [] };
  }
}

export default function Dashboard() {
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

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.filter({ is_active: true })
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

  const activeSub = subscriptions.find(s => s.status === "active");
  const activePlan = activeSub ? plans.find(p => p.id === activeSub.plan_id) : null;

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
    enabled: !!user,
  });

  const favouriteVideos = videos.filter((v) => user?.favourites?.includes(v.id));
  const cwVideos = continueWatching
    .map(({ id, percent, currentTime }) => ({ video: videos.find((v) => v.id === id), percent, currentTime }))
    .filter((x) => x.video);

  const completedVideos = watchedHistory
    .map(({ id }) => videos.find((v) => v.id === id))
    .filter(Boolean);

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
            <h1 className="text-2xl font-black text-foreground">{user.full_name || "My Account"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">{user.role}</Badge>
              {/* Age verified badge hidden */}
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Age verification & adult links hidden */}

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Browse All", icon: Home, to: "/" },
            { label: "Movies", icon: Film, to: "/?tab=movies" },
            { label: "TV Series", icon: TrendingUp, to: "/?tab=tv" },
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

        {/* Favourites */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" /> My Favourites
          </h2>
          {favouriteVideos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No favourites yet. Click the heart icon on any video to save it here.</p>
          ) : (
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
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Billing & Subscriptions</h2>
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-6">
              {activeSub ? (
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Current Plan: {activePlan?.name || "Unknown"}</h3>
                    <p className="text-muted-foreground">You are subscribed and have full access.</p>
                  </div>
                  <Button variant="destructive" onClick={() => handleCancelSub(activeSub.id)}>Cancel Subscription</Button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">Choose a Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map(plan => (
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
                    {plans.length === 0 && <p className="text-muted-foreground">No active plans available.</p>}
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
              <p className="text-3xl font-black text-primary">{favouriteVideos.length}</p>
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