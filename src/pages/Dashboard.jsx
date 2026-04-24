import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/browse/Navbar";
import {
  User, Heart, Clock, ShieldCheck, ShieldAlert, LogOut, Loader2, Play, Calendar, CheckCircle2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useContinueWatching() {
  const raw = localStorage.getItem("xero_progress");
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj)
      .map(([id, data]) => ({ id, ...data }))
      .filter((x) => x.percent < 0.95)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [dob, setDob] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const continueWatching = useContinueWatching();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoadingUser(false);
      if (!u) base44.auth.redirectToLogin("/dashboard");
    }).catch(() => {
      setLoadingUser(false);
      base44.auth.redirectToLogin("/dashboard");
    });
  }, []);

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("sort_order"),
    enabled: !!user,
  });

  const favouriteVideos = videos.filter((v) => user?.favourites?.includes(v.id));
  const cwVideos = continueWatching
    .map(({ id, percent, currentTime }) => ({ video: videos.find((v) => v.id === id), percent, currentTime }))
    .filter((x) => x.video);

  const handleAgeVerificationRequest = async () => {
    if (!dob) return;
    setSubmitting(true);
    await base44.auth.updateMe({ date_of_birth: dob, age_verification_requested: true });
    setUser((prev) => ({ ...prev, date_of_birth: dob, age_verification_requested: true }));
    setSubmitted(true);
    setSubmitting(false);
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
              {user.age_verified && (
                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Age Verified 18+
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

        {/* Age Verification Section */}
        {!user.age_verified && (
          <Card className="bg-card border-border border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ShieldAlert className="w-5 h-5 text-orange-400" />
                Age Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.age_verification_requested || submitted ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p>
                    Your age verification request has been submitted and is <span className="text-yellow-400 font-semibold">pending admin review</span>. 
                    Once approved, you'll gain access to the Adult section.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    To access age-restricted content (18+), please submit your date of birth for admin verification.
                    An admin will review and approve your request.
                  </p>
                  <div className="flex items-end gap-3 max-w-sm">
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm">Date of Birth</Label>
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="bg-secondary border-border"
                        max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                      />
                    </div>
                    <Button onClick={handleAgeVerificationRequest} disabled={!dob || submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Request Verification
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {user.age_verified && (
          <Card className="bg-card border-green-500/30">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-sm text-foreground">You are age-verified and have full access to all content including the <span className="text-primary font-semibold">Adult</span> section.</p>
            </CardContent>
          </Card>
        )}

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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <p className="text-3xl font-black text-primary">{user.age_verified ? "18+" : "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Age Status</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}