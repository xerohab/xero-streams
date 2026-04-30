import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash, Link as LinkIcon, BookOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function BooksManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.list()
  });

  const createBook = useMutation({
    mutationFn: (data) => base44.entities.Book.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["books"]); setEditing(null); }
  });

  const updateBook = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Book.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["books"]); setEditing(null); }
  });

  const deleteBook = useMutation({
    mutationFn: (id) => base44.entities.Book.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["books"])
  });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      price: parseFloat(formData.get("price")),
      cover_image: formData.get("cover_image"),
      file_url: formData.get("file_url"),
      is_active: formData.get("is_active") === "on"
    };

    if (editing?.id) {
      updateBook.mutate({ id: editing.id, data });
    } else {
      createBook.mutate(data);
    }
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Books Store</h3>
        <Button onClick={() => setEditing({})} className="gap-2"><Plus className="w-4 h-4" /> Add Book</Button>
      </div>

      {editing !== null && (
        <form onSubmit={handleSave} className="bg-secondary p-4 rounded-lg space-y-4">
          <Input name="title" placeholder="Book Title" defaultValue={editing.title} required />
          <Textarea name="description" placeholder="Description" defaultValue={editing.description} />
          <div className="flex gap-4">
            <Input name="price" type="number" step="0.01" placeholder="Price" defaultValue={editing.price} required />
          </div>
          <Input name="cover_image" placeholder="Cover Image URL" defaultValue={editing.cover_image} />
          <Input name="file_url" placeholder="Book File URL / Purchase Link" defaultValue={editing.file_url} />
          
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
        {books.map(book => (
          <div key={book.id} className="flex justify-between items-center bg-secondary p-4 rounded-lg">
            <div className="flex items-center gap-4">
              {book.cover_image ? (
                <img src={book.cover_image} alt={book.title} className="w-12 h-16 object-cover rounded" />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground" /></div>
              )}
              <div>
                <p className="font-bold">{book.title} <span className="text-muted-foreground font-normal ml-2">${book.price}</span></p>
                <p className="text-sm text-muted-foreground line-clamp-1">{book.description}</p>
                {!book.is_active && <span className="text-xs text-destructive">Unavailable</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setEditing(book)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if(confirm("Delete?")) deleteBook.mutate(book.id); }}><Trash className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}