import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash, Download, Link as LinkIcon, Film, Book, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function StoreManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [editingType, setEditingType] = useState(null); // 'video' or 'book'
  const [searchQuery, setSearchQuery] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  const handleGrantAccess = async () => {
    if (!grantEmail) return;
    setGranting(true);
    try {
      const users = await base44.entities.User.filter({ email: grantEmail.trim().toLowerCase() });
      if (users.length === 0) {
        toast.error("User not found with that email");
        setGranting(false);
        return;
      }
      const targetUser = users[0];
      if (editingType === "video") {
        await base44.entities.VideoPurchase.create({
          user_id: targetUser.id,
          video_id: editing.id,
          status: "completed",
          paypal_order_id: "admin_granted"
        });
      } else {
        await base44.entities.BookPurchase.create({
          user_id: targetUser.id,
          book_id: editing.id,
          status: "completed",
          paypal_order_id: "admin_granted"
        });
      }
      
      try {
        await base44.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: "You have been granted access to " + editing.title,
          body: `Hi ${targetUser.full_name || 'there'},\n\nYou have been granted access to download ${editing.title}.\n\nYou can download it directly using this link:\n${editing._download_url || "Log in to your dashboard to view the download link."}\n\nAlternatively, log in to your dashboard to view all your downloads.`
        });
      } catch (e) {
        console.error("Email failed:", e);
      }

      toast.success("Access granted & email sent to " + targetUser.full_name);
      setGrantEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to grant access");
    }
    setGranting(false);
  };

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => base44.entities.Video.list("-created_date")
  });

  const { data: books = [], isLoading: loadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.list("-created_date")
  });

  const updateVideo = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Video.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["videos"]); setEditing(null); toast.success("Updated!"); }
  });

  const updateBook = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Book.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["books"]); setEditing(null); toast.success("Updated!"); }
  });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get("title"),
      price: parseFloat(formData.get("price") || 0),
      is_for_sale: formData.get("is_for_sale") === "on",
      download_url: formData.get("download_url") || ""
    };
    
    // Check "part of subscription" (we can use is_active on book, or just free for subs)
    // Here we're mainly updating purchase settings.

    if (editingType === "video") {
      updateVideo.mutate({ id: editing.id, data });
    } else {
      updateBook.mutate({ 
        id: editing.id, 
        data: { 
          ...data, 
          is_active: data.is_for_sale, // for books, is_active represents available for purchase
          file_url: data.download_url
        } 
      });
    }
  };

  if (loadingVideos || loadingBooks) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  const storeItems = [
    ...videos.filter(v => v.is_for_sale).map(v => ({ ...v, _type: 'video', _download_url: v.download_url })),
    ...books.filter(b => b.is_active).map(b => ({ ...b, _type: 'book', is_for_sale: b.is_active, _download_url: b.file_url }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const allItems = [
    ...videos.map(v => ({ ...v, _type: 'video', _download_url: v.download_url })),
    ...books.map(b => ({ ...b, _type: 'book', is_for_sale: b.is_active, _download_url: b.file_url }))
  ];

  const searchResults = searchQuery.trim() 
    ? allItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Store & Downloads Manager</h3>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <h4 className="font-medium mb-3">Add Content to Store</h4>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a movie, episode, or book to sell..." 
            className="pl-9 bg-secondary border-border"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
              {searchResults.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0" onClick={() => { setEditingType(item._type); setEditing(item); setSearchQuery(""); }}>
                  <div className="flex items-center gap-2">
                    {item._type === 'video' ? <Film className="w-4 h-4 text-primary" /> : <Book className="w-4 h-4 text-primary" />}
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>
                  {item.is_for_sale && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">In Store</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing !== null && (
        <>
        <form onSubmit={handleSave} className="bg-secondary p-5 border border-primary/30 rounded-lg space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            {editingType === 'video' ? <Film className="w-5 h-5 text-primary" /> : <Book className="w-5 h-5 text-primary" />}
            <h4 className="font-bold text-lg">Edit Store Options: {editing.title}</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Content Title</label>
              <Input name="title" defaultValue={editing.title} required className="bg-background border-border" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Price ($)</label>
              <Input name="price" type="number" step="0.01" defaultValue={editing.price || 0} required className="bg-background border-border" />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Download Link (URL)</label>
            <Input name="download_url" placeholder="https://... file link for purchasers" defaultValue={editing._download_url} className="bg-background border-border" />
            <p className="text-xs text-muted-foreground mt-1">Users who purchase this item will receive this link in their Downloads section.</p>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg">
            <Switch name="is_for_sale" defaultChecked={editing.is_for_sale} />
            <div>
              <label className="font-semibold text-sm">Available for Purchase</label>
              <p className="text-xs text-muted-foreground">If disabled, it will be hidden from the store / downloads area.</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save Store Settings</Button>
          </div>
        </form>

        <div className="bg-secondary p-5 border border-primary/30 rounded-lg space-y-4 mb-6">
          <h4 className="font-bold text-lg flex items-center gap-2">Grant Individual Access</h4>
          <p className="text-sm text-muted-foreground">
            Grant a specific user access to download this item without making it publicly available. They will receive an email with the link and it will appear in their dashboard downloads.
          </p>
          <div className="flex gap-2 items-center">
            <Input 
              placeholder="User Email Address" 
              value={grantEmail} 
              onChange={e => setGrantEmail(e.target.value)} 
              className="bg-background border-border max-w-sm" 
            />
            <Button onClick={handleGrantAccess} disabled={granting || !grantEmail}>
              {granting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Grant & Email
            </Button>
          </div>
        </div>
        </>
      )}

      <div>
        <h4 className="font-medium mb-3">Currently in Store ({storeItems.length})</h4>
        <div className="grid gap-3">
          {storeItems.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-secondary p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  {item._type === 'video' ? <Film className="w-6 h-6 text-muted-foreground" /> : <Book className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2">
                    {item.title} 
                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">${item.price}</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate max-w-md">
                    <Download className="w-3 h-3" /> {item._download_url || "No download link set"}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditingType(item._type); setEditing(item); }}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Store Options
              </Button>
            </div>
          ))}
          {storeItems.length === 0 && (
            <p className="text-muted-foreground text-center py-8 bg-secondary rounded-lg">No items currently available for purchase.</p>
          )}
        </div>
      </div>
    </div>
  );
}