import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Toaster } from "react-hot-toast";
import AdultVideoUploadForm from "@/components/admin/AdultVideoUploadForm";
import AdultSeriesForm from "@/components/admin/AdultSeriesForm";
import AdultWebScraper from "@/components/admin/AdultWebScraper";
import AdultBulkImageUpload from "@/components/admin/AdultBulkImageUpload";
import AdultManageSection from "@/components/admin/AdultManageSection";
import AdultSortOrderManager from "@/components/admin/AdultSortOrderManager";

export default function AdminAdult() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["admin-adult-videos"],
    queryFn: () => base44.entities.Video.filter({ is_adult: true }, "-created_date"),
    enabled: !!user && user.role === "admin",
  });

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({
    queryKey: ["admin-adult-series"],
    queryFn: () => base44.entities.Series.filter({ is_adult: true }),
    enabled: !!user && user.role === "admin",
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
    enabled: !!user && user.role === "admin",
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-adult-videos"] });
    queryClient.invalidateQueries({ queryKey: ["admin-adult-series"] });
  };

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Admin access required.</p>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "1px solid #333" } }} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-foreground">Adult Content Admin</h1>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">18+</span>
              </div>
              <p className="text-sm text-muted-foreground">Manage the Leaks section — kept separate from main site</p>
            </div>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <ShieldAlert className="w-4 h-4" /> Main Admin
            </Button>
          </Link>
        </div>

        {/* Red accent bar */}
        <div className="h-1 bg-gradient-to-r from-red-600 to-red-900 rounded-full mb-8" />

        <Tabs defaultValue="add-video" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1">
            <TabsTrigger value="add-video">Add Video / Image</TabsTrigger>
            <TabsTrigger value="add-series">Add Series</TabsTrigger>
            <TabsTrigger value="scraper">Scraper</TabsTrigger>
            <TabsTrigger value="bulk-images">Bulk Images</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="sort">Sort Order</TabsTrigger>
          </TabsList>

          <TabsContent value="add-video">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Add Adult Video / Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultVideoUploadForm adultSeriesList={seriesList} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-series">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Create Adult Series
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultSeriesForm onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scraper">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Scrape Adult Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultWebScraper adultSeriesList={seriesList} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-images">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Bulk Image Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultBulkImageUpload adultSeriesList={seriesList} onSuccess={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Manage Adult Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultManageSection
                  videos={videos}
                  seriesList={seriesList}
                  franchises={franchises}
                  loadingVideos={loadingVideos}
                  loadingSeries={loadingSeries}
                  onRefresh={refresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sort">
            <Card className="bg-card border-red-500/20">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Sort Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdultSortOrderManager videos={videos} seriesList={seriesList} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}