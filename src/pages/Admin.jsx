import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Film, Video, Trash2, Loader2, Play, Pencil, ImageIcon } from "lucide-react";
import VideoUploadForm from "@/components/admin/VideoUploadForm";
import SeriesForm from "@/components/admin/SeriesForm";
import BulkEpisodeUpload from "@/components/admin/BulkEpisodeUpload";
import WebScraper from "@/components/admin/WebScraper";
import EditVideoModal from "@/components/admin/EditVideoModal";
import EditSeriesModal from "@/components/admin/EditSeriesModal";
import FranchiseForm from "@/components/admin/FranchiseForm";
import { Toaster } from "react-hot-toast";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [fetchingPosterFor, setFetchingPosterFor] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
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

  if (user && user.role !== "admin") {
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
          <div className="flex gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <Film className="w-3 h-3" />{seriesList.length} Series
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Video className="w-3 h-3" />{videos.length} Videos
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1">
            <TabsTrigger value="upload">Add Movie</TabsTrigger>
            <TabsTrigger value="episodes">Add Episodes</TabsTrigger>
            <TabsTrigger value="scrape">Scrape URL</TabsTrigger>
            <TabsTrigger value="series">Add Series</TabsTrigger>
            <TabsTrigger value="franchise">Add Franchise</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
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
                <WebScraper seriesList={seriesList} onSuccess={refresh} />
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

          <TabsContent value="manage">
            <div className="space-y-6">
              {/* Series */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Film className="w-5 h-5" /> Series
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSeries ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : seriesList.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No series yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {seriesList.map((s) => (
                        <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            {s.cover_image && (
                              <img src={s.cover_image} alt="" className="w-12 h-8 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-semibold text-foreground text-sm">{s.title}</p>
                              {s.category && (
                                <Badge variant="outline" className="text-xs mt-0.5">{s.category}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setEditingSeries(s)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteSeries(s.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Video className="w-5 h-5" /> Videos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingVideos ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : videos.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No videos yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {videos.map((v) => {
                        const series = seriesList.find((s) => s.id === v.series_id);
                        return (
                          <div key={v.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-16 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                                {v.thumbnail_url ? (
                                  <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">{v.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {series && <span className="text-xs text-primary">{series.title}</span>}
                                  {v.episode_number && <span className="text-xs text-muted-foreground">EP {v.episode_number}</span>}
                                  {v.content_type === "movie" && <Badge className="text-xs bg-blue-500/20 text-blue-400">Movie</Badge>}
                                  {v.is_featured && <Badge className="text-xs bg-primary/20 text-primary">Featured</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="text-muted-foreground hover:text-yellow-400"
                                 title="Auto-fetch poster"
                                 onClick={() => fetchPoster(v)}
                                 disabled={fetchingPosterFor === v.id}
                               >
                                 {fetchingPosterFor === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                               </Button>
                               <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setEditingVideo(v)}>
                                 <Pencil className="w-4 h-4" />
                               </Button>
                               <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteVideo(v.id)}>
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
    </div>
  );
}