import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import { Loader2, BookOpen, Download, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function Books() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.filter({ is_active: true })
  });

  const { data: purchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: ["book_purchases", user?.id],
    queryFn: () => base44.entities.BookPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const handlePurchase = async (book) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    base44.analytics.track({ eventName: "book_purchase_initiated", properties: { book_id: book.id, price: book.price } });
    setPurchasing(book.id);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { 
        amount: book.price,
        return_url: window.location.origin + "/callback?success=true",
        cancel_url: window.location.origin + "/callback?cancelled=true"
      });
      if (res.data?.approvalUrl) {
        // Save pending purchase info in localStorage to capture later (a bit hacky but works for simple flows)
        localStorage.setItem("pending_book_purchase", JSON.stringify({ book_id: book.id }));
        window.location.href = res.data.approvalUrl;
      } else {
        throw new Error(res.data?.error || "Failed to start checkout");
      }
    } catch (err) {
      toast.error(err.message);
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 max-w-6xl mx-auto pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground">Library</h1>
            <p className="text-muted-foreground">Discover and download our exclusive books</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No books available at the moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map(book => {
              const isPurchased = purchases.some(p => p.book_id === book.id && p.status === "completed");

              return (
                <div key={book.id} className="bg-card border-border rounded-xl overflow-hidden shadow-lg flex flex-col">
                  {book.cover_image ? (
                    <div className="aspect-[3/4] bg-muted w-full relative">
                      <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-secondary w-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{book.description}</p>
                    
                    {isPurchased ? (
                      <Button className="w-full gap-2" variant="default" onClick={() => window.open(book.file_url, '_blank')}>
                        <Download className="w-4 h-4" /> Download Book
                      </Button>
                    ) : (
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => handlePurchase(book)}
                        disabled={purchasing === book.id}
                      >
                        {purchasing === book.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                        Buy for ${book.price}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}