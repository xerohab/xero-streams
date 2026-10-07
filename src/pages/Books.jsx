import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { Loader2, BookOpen, Download, ShoppingCart, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/browse/StatusBadge";
import toast from "react-hot-toast";

export default function Books() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.filter({ is_active: true }, "sort_order")
  });

  const { data: authors = [], isLoading: loadingAuthors } = useQuery({
    queryKey: ["book_authors"],
    queryFn: () => base44.entities.BookAuthor.list()
  });

  const { data: purchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: ["book_purchases", user?.id],
    queryFn: () => base44.entities.BookPurchase.filter({ user_id: user.id }),
    enabled: !!user
  });

  const handlePurchase = async (book, format = "default") => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    
    let price = book.price || 0;
    if (format === "word" && book.price_word) price = book.price_word;
    if (format === "ebook" && book.price_ebook) price = book.price_ebook;

    base44.analytics.track({ eventName: "book_purchase_initiated", properties: { book_id: book.id, price, format } });
    setPurchasing(book.id + format);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { 
        amount: price,
        return_url: window.location.origin + "/callback?success=true",
        cancel_url: window.location.origin + "/callback?cancelled=true"
      });
      if (res.data?.approvalUrl) {
        localStorage.setItem("pending_book_purchase", JSON.stringify({ book_id: book.id, format }));
        window.location.href = res.data.approvalUrl;
      } else {
        throw new Error(res.data?.error || "Failed to start checkout");
      }
    } catch (err) {
      toast.error(err.message);
      setPurchasing(null);
    }
  };

  const renderBookCard = (book) => {
    const purchasedDefault = purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "default");
    const purchasedWord = purchasedDefault || purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "word");
    const purchasedEbook = purchasedDefault || purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "ebook");
    const author = authors.find(a => a.id === book.author_id);
    const isExclusive = author && author.name.toLowerCase().includes("asher");
    const isOwned = purchasedWord || purchasedEbook || purchasedDefault;

    return (
      <div key={book.id} className="group relative flex flex-col gap-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 bg-card border border-transparent hover:border-border/50 max-w-[180px] w-full mx-auto">
        <div className="relative aspect-[2/3] w-full bg-secondary/30 rounded-xl overflow-hidden shadow-inner">
          {book.cover_image ? (
            <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <BookOpen className="w-10 h-10 opacity-30" />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white pointer-events-none group-hover:pointer-events-auto">
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-2 w-full h-full justify-end">
              <p className="text-[10px] text-gray-300 line-clamp-4 mb-2">{book.description}</p>
              
              {book.price_word > 0 && (
                purchasedWord ? (
                  <button className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => window.open(book.file_url_word, '_blank')}>
                    <Download className="w-3 h-3" /> Word Doc
                  </button>
                ) : (
                  <button className="w-full bg-primary text-primary-foreground font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => handlePurchase(book, "word")} disabled={purchasing === book.id + "word"}>
                    {purchasing === book.id + "word" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Buy Word (${book.price_word})
                  </button>
                )
              )}

              {book.price_ebook > 0 && (
                purchasedEbook ? (
                  <button className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => window.open(book.file_url_ebook, '_blank')}>
                    <Download className="w-3 h-3" /> Ebook
                  </button>
                ) : (
                  <button className="w-full bg-primary text-primary-foreground font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => handlePurchase(book, "ebook")} disabled={purchasing === book.id + "ebook"}>
                    {purchasing === book.id + "ebook" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Buy Ebook (${book.price_ebook})
                  </button>
                )
              )}

              {(!book.price_word && !book.price_ebook) && (
                purchasedDefault || purchasedWord || purchasedEbook ? (
                  <button className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => window.open(book.file_url || book.file_url_ebook || book.file_url_word, '_blank')}>
                    <Download className="w-3 h-3" /> Download
                  </button>
                ) : (
                  <button className="w-full bg-primary text-primary-foreground font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors" onClick={() => handlePurchase(book, "default")} disabled={purchasing === book.id + "default"}>
                    {purchasing === book.id + "default" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Buy (${book.price})
                  </button>
                )
              )}

            </div>
          </div>

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10 pointer-events-none">
            {isExclusive && <StatusBadge status="EXCLUSIVE" />}
            {isOwned && <StatusBadge status="OWNED" />}
          </div>
        </div>
        
        <div className="px-1 py-1">
          <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
            {author ? <span className="line-clamp-1">{author.name}</span> : <span>Unknown Author</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderBookRow = (bookList) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 md:gap-4 lg:gap-5 justify-center">
      {bookList.map(renderBookCard)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Books Hero */}
      <div className="relative w-full h-[35vh] md:h-[45vh] min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto mt-16">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-full mb-4 ring-1 ring-primary/30">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-xl mb-4">Books</h1>
          <p className="text-sm md:text-lg text-gray-300 font-medium drop-shadow-md">Discover your next story. Browse books available through Xero Streams, including exclusive titles.</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1800px] mx-auto px-4 md:px-12 lg:px-16 pb-20 -mt-10 relative z-20 space-y-16">
        {isLoading || loadingAuthors ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No books available at the moment.</div>
        ) : (
          <div className="space-y-12">
            {(() => {
              const authorsWithBooks = authors.filter(a => books.some(b => b.author_id === a.id));
              const booksWithoutAuthor = books.filter(b => !b.author_id || !authors.find(a => a.id === b.author_id));
              
              const exclusiveBooks = books.filter(b => {
                 const a = authors.find(au => au.id === b.author_id);
                 return a && a.name.toLowerCase().includes("asher");
              });

              return (
                <>
                  {exclusiveBooks.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-2 mb-4">
                         <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Xero Streams Exclusives</h2>
                         <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 ml-2">Asher Crawford</Badge>
                      </div>
                      {renderBookRow(exclusiveBooks)}
                    </div>
                  )}

                  {authorsWithBooks.filter(a => !a.name.toLowerCase().includes("asher")).map(author => {
                     const authorBooks = books.filter(b => b.author_id === author.id);
                     if (authorBooks.length === 0) return null;
                     return (
                        <div key={author.id} className="animate-in fade-in slide-in-from-bottom-4">
                          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-4">{author.name}</h2>
                          {renderBookRow(authorBooks)}
                        </div>
                     )
                  })}

                  {booksWithoutAuthor.length > 0 && (
                     <div className="animate-in fade-in slide-in-from-bottom-4">
                       <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-4">More Books</h2>
                       {renderBookRow(booksWithoutAuthor)}
                     </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}