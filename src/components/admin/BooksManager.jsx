import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash, BookOpen, Users, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function BooksManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.list("sort_order")
  });

  const { data: authors = [], isLoading: loadingAuthors } = useQuery({
    queryKey: ["book_authors"],
    queryFn: () => base44.entities.BookAuthor.list()
  });

  const createBook = useMutation({
    mutationFn: /** @param {Record<string, unknown>} data */ (data) => base44.entities.Book.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books"] }); setEditing(null); }
  });

  const updateBook = useMutation({
    mutationFn: /** @param {{id: string, data: Record<string, unknown>}} variables */ ({ id, data }) => base44.entities.Book.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books"] }); setEditing(null); }
  });

  const deleteBook = useMutation({
    mutationFn: /** @param {string} id */ (id) => base44.entities.Book.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] })
  });

  const createAuthor = useMutation({
    mutationFn: /** @param {Record<string, unknown>} data */ (data) => base44.entities.BookAuthor.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["book_authors"] }); setEditingAuthor(null); }
  });

  const updateAuthor = useMutation({
    mutationFn: /** @param {{id: string, data: Record<string, unknown>}} variables */ ({ id, data }) => base44.entities.BookAuthor.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["book_authors"] }); setEditingAuthor(null); }
  });

  const deleteAuthor = useMutation({
    mutationFn: /** @param {string} id */ (id) => base44.entities.BookAuthor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["book_authors"] })
  });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      author_id: formData.get("author_id"),
      sort_order: parseFloat(String(formData.get("sort_order") || 0)),
      price: parseFloat(String(formData.get("price") || 0)),
      price_word: parseFloat(String(formData.get("price_word") || 0)),
      price_ebook: parseFloat(String(formData.get("price_ebook") || 0)),
      cover_image: formData.get("cover_image"),
      file_url: formData.get("file_url"),
      file_url_word: formData.get("file_url_word"),
      file_url_ebook: formData.get("file_url_ebook"),
      is_active: formData.get("is_active") === "on"
    };

    if (editing?.id) {
      updateBook.mutate({ id: editing.id, data });
    } else {
      createBook.mutate(data);
    }
  };

  const handleAiInfo = async () => {
    const titleInput = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="title"]'));
    if (!titleInput || !titleInput.value) return alert("Enter a title first");
    setIsAiLoading(true);
    try {
      const res = await base44.functions.invoke("aiMediaInfo", { title: titleInput.value, type: "book" });
      if (res.data?.title) titleInput.value = res.data.title;
      if (res.data?.description) {
        const descInput = /** @type {HTMLTextAreaElement | null} */ (document.querySelector('textarea[name="description"]'));
        if (descInput) descInput.value = res.data.description;
      }
    } catch (e) {
      alert("AI failed: " + e.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAuthor = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      avatar_url: formData.get("avatar_url"),
    };
    if (editingAuthor?.id) {
      updateAuthor.mutate({ id: editingAuthor.id, data });
    } else {
      createAuthor.mutate(data);
    }
  };

  if (isLoading || loadingAuthors) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Books Store</h3>
        <div className="flex gap-2">
          <Button onClick={() => setEditingAuthor({})} variant="outline" className="gap-2"><Users className="w-4 h-4" /> Manage Authors</Button>
          <Button onClick={() => setEditing({})} className="gap-2"><Plus className="w-4 h-4" /> Add Book</Button>
        </div>
      </div>

      {editingAuthor !== null && (
        <form onSubmit={handleSaveAuthor} className="bg-secondary p-4 rounded-lg space-y-4 border border-primary/20">
          <h4 className="font-semibold mb-2">{editingAuthor.id ? "Edit Author" : "New Author"}</h4>
          <Input name="name" placeholder="Author Name" defaultValue={editingAuthor.name} required />
          <Textarea name="description" placeholder="Author Bio / Description" defaultValue={editingAuthor.description} />
          <Input name="avatar_url" placeholder="Avatar Image URL" defaultValue={editingAuthor.avatar_url} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingAuthor(null)}>Cancel</Button>
            <Button type="submit">Save Author</Button>
          </div>

          {/* List of existing authors for easy editing/deleting */}
          <div className="mt-4 pt-4 border-t border-border">
            <h5 className="text-sm font-medium text-muted-foreground mb-2">Existing Authors</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {authors.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-background p-2 rounded text-sm">
                  <div className="flex items-center gap-2">
                    {a.avatar_url ? <img src={a.avatar_url} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"><Users className="w-3 h-3" /></div>}
                    <span>{a.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" type="button" className="h-6 w-6" onClick={() => setEditingAuthor(a)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-6 w-6 text-destructive" onClick={() => { if(confirm("Delete author?")) deleteAuthor.mutate(a.id); }}><Trash className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
              {authors.length === 0 && <p className="text-xs text-muted-foreground">No authors yet.</p>}
            </div>
          </div>
        </form>
      )}

      {editing !== null && !editingAuthor && (
        <form onSubmit={handleSave} className="bg-secondary p-4 rounded-lg space-y-4">
          <div className="flex gap-2">
            <Input name="title" placeholder="Book Title" defaultValue={editing.title} required className="flex-1" />
            <Button type="button" variant="secondary" onClick={handleAiInfo} disabled={isAiLoading} className="flex-shrink-0 border border-primary/20">
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {isAiLoading ? "" : "AI Info"}
            </Button>
          </div>
          <Textarea name="description" placeholder="Description" defaultValue={editing.description} className="h-24" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Author (Optional)</label>
              <select
                name="author_id"
                defaultValue={editing.author_id || ""}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No specific author</option>
                {authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sort Order</label>
              <Input name="sort_order" type="number" placeholder="0" defaultValue={editing.sort_order || 0} />
            </div>
          </div>

          <div className="flex gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Default Price</label>
              <Input name="price" type="number" step="0.01" placeholder="Default Price" defaultValue={editing.price} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Word Document Price</label>
              <Input name="price_word" type="number" step="0.01" placeholder="Word Price" defaultValue={editing.price_word} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ebook Price</label>
              <Input name="price_ebook" type="number" step="0.01" placeholder="Ebook Price" defaultValue={editing.price_ebook} />
            </div>
          </div>
          <Input name="cover_image" placeholder="Cover Image URL" defaultValue={editing.cover_image} />
          <Input name="file_url" placeholder="Default Book File URL / Purchase Link" defaultValue={editing.file_url} />
          <Input name="file_url_word" placeholder="Word Document Download Link" defaultValue={editing.file_url_word} />
          <Input name="file_url_ebook" placeholder="Ebook Download Link" defaultValue={editing.file_url_ebook} />

          <div className="flex items-center gap-2">
            <Switch name="is_active" defaultChecked={editing.is_active !== false} />
            <label className="text-sm">Available for Purchase</label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save Book</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {books.map(book => {
          const author = authors.find(a => a.id === book.author_id);
          return (
          <div key={book.id} className="flex justify-between items-center bg-secondary p-4 rounded-lg">
            <div className="flex items-center gap-4">
              {book.cover_image ? (
                <img src={book.cover_image} alt={book.title} className="w-12 h-16 object-cover rounded" />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground" /></div>
              )}
              <div>
                <p className="font-bold">{book.title} <span className="text-muted-foreground font-normal ml-2">${book.price}</span></p>
                {author && <p className="text-xs text-primary font-medium mt-0.5 mb-1">By {author.name}</p>}
                <p className="text-sm text-muted-foreground line-clamp-1">{book.description}</p>
                {!book.is_active && <span className="text-xs text-destructive">Unavailable</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setEditing(book)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if(confirm("Delete?")) deleteBook.mutate(book.id); }}><Trash className="w-4 h-4" /></Button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
