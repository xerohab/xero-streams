import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Film, Video, Loader2, ImageIcon, Users, ShieldCheck, ShieldAlert, Heart, Pencil } from "lucide-react";
import ManageSection from "@/components/admin/ManageSection";
import ImageScraper from "@/components/admin/ImageScraper";
import VideoUploadForm from "@/components/admin/VideoUploadForm";
import SeriesForm from "@/components/admin/SeriesForm";
import BulkEpisodeUpload from "@/components/admin/BulkEpisodeUpload";
import WebScraper from "@/components/admin/WebScraper";
import EditVideoModal from "@/components/admin/EditVideoModal";
import EditSeriesModal from "@/components/admin/EditSeriesModal";
import FranchiseForm from "@/components/admin/FranchiseForm";
import FranchiseMassEditor from "@/components/admin/FranchiseMassEditor";
import SortOrderManager from "@/components/admin/SortOrderManager";
import EditUserModal from "@/components/admin/EditUserModal";
import DonationSettings from "@/components/admin/DonationSettings";
import { Toaster } from "react-hot-toast";
import { Link as RouterLink } from "react-router-dom";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null); // null = loading
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [fetchingPosterFor, setFetchingPosterFor] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.functions.invoke("checkAdminStatus", {}).then(r => setIsAdmin(r.data?.isAdmin === true)).catch(() => setIsAdmin(false));
  }, []);

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date"),
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["series"],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
  });

  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    enabled: isAdmin === true,
  });

  const setUserAgeVerified = async (userId, verified) => {
    await base44.entities.User.update(userId, { age_verified: verified });
    refetchUsers();
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["videos"] });
    queryClient.invalidateQueries({ queryKey: ["series"] });
    queryClient.invalidateQueries({ queryKey: ["franchises"] });
  };

  const deleteVideo = async (id) => {
    await base44.entities.Video.delete(id);
    refresh();
  };

  const deleteSeries = async (id) => {
    await base44.entities.Series.delete(id);
    refresh();
  };

  const fetchPoster = async (v) => {
    setFetchingPosterFor(v.id);
    const series = seriesList.find((s) => s.id === v.series_id);
    const titleToSearch = series ? series.title : v.title;
    const type = v.content_type === "movie" ? "movie" : "tv";
    await base44.functions.invoke("fetchPoster", { title: titleToSearch, type, videoId: v.id });
    refresh();
    setFetchingPosterFor(null);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Admin access is required.</p>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "1px solid #333" } }} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage your video library</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <Film className="w-3 h-3" />{seriesList.length} Series
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Video className="w-3 h-3" />{videos.length} Videos
            </Badge>
            {/* Adult Admin link hidden */}
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1">
            <TabsTrigger value="upload">Add Movie</TabsTrigger>
            <TabsTrigger value="episodes">Add Episodes</TabsTrigger>
            <TabsTrigger value="scrape">Scrape URL</TabsTrigger>
            <TabsTrigger value="imagescrape">Image Scraper</TabsTrigger>
            <TabsTrigger value="series">Add Series</TabsTrigger>
            <TabsTrigger value="franchise">Add Franchise</TabsTrigger>
            <TabsTrigger value="franchiseedit">Franchise Editor</TabsTrigger>
            <TabsTrigger value="sortorder">Sort Order</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Upload Movie / Standalone Video</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUploadForm seriesList={seriesList} franchises={franchises} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="episodes">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Add Episodes to a Series</CardTitle>
              </CardHeader>
              <CardContent>
                <BulkEpisodeUpload seriesList={seriesList} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scrape">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Scrape Video Links from URL</CardTitle>
              </CardHeader>
              <CardContent>
                <WebScraper seriesList={seriesList} franchises={franchises} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="series">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Create New Series</CardTitle>
              </CardHeader>
              <CardContent>
                <SeriesForm franchises={franchises} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="franchise">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Create New Franchise / Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <FranchiseForm onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="franchiseedit">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Bulk Assign to Franchise</CardTitle>
              </CardHeader>
              <CardContent>
                <FranchiseMassEditor
                  franchises={franchises}
                  videos={videos}
                  seriesList={seriesList}
                  onSuccess={refresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sortorder">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Reorder Movies / Episodes</CardTitle>
              </CardHeader>
              <CardContent>
                <SortOrderManager
                  franchises={franchises}
                  videos={videos}
                  seriesList={seriesList}
                  onSuccess={refresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="imagescrape">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" /> Image Scraper
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImageScraper
                  seriesList={seriesList}
                  videos={videos}
                  franchises={franchises}
                  onSuccess={refresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <ManageSection
              videos={videos}
              seriesList={seriesList}
              loadingVideos={loadingVideos}
              loadingSeries={loadingSeries}
              fetchingPosterFor={fetchingPosterFor}
              onEditVideo={setEditingVideo}
              onDeleteVideo={deleteVideo}
              onEditSeries={setEditingSeries}
              onDeleteSeries={deleteSeries}
              onFetchPoster={fetchPoster}
            />
          </TabsContent>
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5" /> User Management & Age Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : allUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No users yet.</p>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between bg-secondary rounded-lg p-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground text-sm truncate">{u.full_name || "—"}</p>
                            <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                            {u.age_verified && (
                              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">18+ Verified</Badge>
                            )}
                            {u.age_verification_requested && !u.age_verified && (
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Verification Pending</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                          {u.date_of_birth && (
                            <p className="text-xs text-muted-foreground">DOB: {u.date_of_birth}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {u.age_verified ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive text-xs gap-1"
                              onClick={() => setUserAgeVerified(u.id, false)}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Revoke 18+
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 text-xs gap-1"
                              onClick={() => setUserAgeVerified(u.id, true)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Approve 18+
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingUser(u)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donations">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" /> Donation Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DonationSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Modals */}
      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          seriesList={seriesList}
          franchises={franchises}
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          onSaved={refresh}
        />
      )}
      {editingSeries && (
        <EditSeriesModal
          series={editingSeries}
          franchises={franchises}
          open={!!editingSeries}
          onClose={() => setEditingSeries(null)}
          onSaved={refresh}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={refetchUsers}
        />
      )}
    </div>
  );
}