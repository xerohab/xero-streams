import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import { Loader2, BookOpen, Download, ShoppingCart, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function Books() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [selectedAuthor, setSelectedAuthor] = useState(null);

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
        // Save pending purchase info in localStorage to capture later (a bit hacky but works for simple flows)
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

        {isLoading || loadingAuthors ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No books available at the moment.</div>
        ) : (
          <div className="space-y-12">
            {/* Group by Author if applicable */}
            {(() => {
              // Get unique authors that have active books
              const authorsWithBooks = authors.filter(a => books.some(b => b.author_id === a.id));
              const booksWithoutAuthor = books.filter(b => !b.author_id || !authors.find(a => a.id === b.author_id));

              const renderBookGrid = (bookList) => (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 md:gap-6 justify-center mt-6">
                  {bookList.map(book => {
                    const purchasedDefault = purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "default");
                    const purchasedWord = purchasedDefault || purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "word");
                    const purchasedEbook = purchasedDefault || purchases.some(p => p.book_id === book.id && p.status === "completed" && p.format === "ebook");

                    return (
                      <div key={book.id} className="bg-card border-border rounded-xl overflow-hidden shadow-lg flex flex-col items-center pt-6">
                        {book.cover_image ? (
                          <div className="aspect-[3/4] bg-muted w-1/2 relative rounded-md shadow-md overflow-hidden">
                            <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-[3/4] bg-secondary w-1/2 flex items-center justify-center rounded-md shadow-md">
                            <BookOpen className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-5 w-full flex-1 flex flex-col">
                          <h3 className="text-xl font-bold mb-2">{book.title}</h3>
                          {authors.find(a => a.id === book.author_id) && (
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-semibold text-primary">
                                By {authors.find(a => a.id === book.author_id).name}
                              </p>
                              {authors.find(a => a.id === book.author_id).name.toLowerCase().includes("asher") && (
                                <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Exclusive</span>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mb-4 flex-1">{book.description}</p>
                          
                          <div className="space-y-2">
                            {/* Word Format */}
                            {book.price_word > 0 && (
                              purchasedWord ? (
                                <Button className="w-full gap-2" variant="default" onClick={() => window.open(book.file_url_word, '_blank')}>
                                  <Download className="w-4 h-4" /> Download Word Doc
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full gap-2" 
                                  variant="outline"
                                  onClick={() => handlePurchase(book, "word")}
                                  disabled={purchasing === book.id + "word"}
                                >
                                  {purchasing === book.id + "word" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                  Buy Word Doc (${book.price_word})
                                </Button>
                              )
                            )}

                            {/* Ebook Format */}
                            {book.price_ebook > 0 && (
                              purchasedEbook ? (
                                <Button className="w-full gap-2" variant="default" onClick={() => window.open(book.file_url_ebook, '_blank')}>
                                  <Download className="w-4 h-4" /> Download Ebook
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full gap-2" 
                                  variant="outline"
                                  onClick={() => handlePurchase(book, "ebook")}
                                  disabled={purchasing === book.id + "ebook"}
                                >
                                  {purchasing === book.id + "ebook" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                  Buy Ebook (${book.price_ebook})
                                </Button>
                              )
                            )}

                            {/* Default Format (Legacy or general) */}
                            {(!book.price_word && !book.price_ebook) && (
                              purchasedDefault || purchasedWord || purchasedEbook ? (
                                <Button className="w-full gap-2" variant="default" onClick={() => window.open(book.file_url || book.file_url_ebook || book.file_url_word, '_blank')}>
                                  <Download className="w-4 h-4" /> Download Book
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full gap-2" 
                                  onClick={() => handlePurchase(book, "default")}
                                  disabled={purchasing === book.id + "default"}
                                >
                                  {purchasing === book.id + "default" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                  Buy for ${book.price}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );

              if (selectedAuthor === null) {
                return (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 md:gap-6 justify-center">
                    {authorsWithBooks.map(author => (
                      <div 
                        key={author.id} 
                        onClick={() => setSelectedAuthor(author.id)}
                        className="cursor-pointer bg-card border-border rounded-xl shadow hover:shadow-lg p-6 flex flex-col items-center text-center transition-all hover:border-primary/50"
                      >
                        {author.avatar_url ? (
                          <img src={author.avatar_url} className="w-20 h-20 rounded-full object-cover mb-4" alt={author.name} />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <Users className="w-10 h-10 text-muted-foreground" />
                          </div>
                        )}
                        <h3 className="font-bold text-foreground">{author.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{books.filter(b => b.author_id === author.id).length} Books</p>
                      </div>
                    ))}
                    
                    {booksWithoutAuthor.length > 0 && (
                      <div 
                        onClick={() => setSelectedAuthor("other")}
                        className="cursor-pointer bg-card border-border rounded-xl shadow hover:shadow-lg p-6 flex flex-col items-center text-center transition-all hover:border-primary/50"
                      >
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                          <BookOpen className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-foreground">Other Books</h3>
                        <p className="text-xs text-muted-foreground mt-1">{booksWithoutAuthor.length} Books</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (selectedAuthor === "other") {
                return (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Button variant="ghost" onClick={() => setSelectedAuthor(null)} className="mb-6 gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Authors
                    </Button>
                    <h2 className="text-2xl font-bold text-foreground border-b border-border pb-4">Other Books</h2>
                    {renderBookGrid(booksWithoutAuthor)}
                  </div>
                );
              }

              const author = authors.find(a => a.id === selectedAuthor);
              if (!author) {
                setSelectedAuthor(null);
                return null;
              }

              return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Button variant="ghost" onClick={() => setSelectedAuthor(null)} className="mb-6 gap-2 -ml-4">
                    <ArrowLeft className="w-4 h-4" /> Back to Authors
                  </Button>
                  <div className="flex items-center gap-4 border-b border-border pb-6">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} className="w-16 h-16 rounded-full object-cover shadow-sm" alt={author.name} />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shadow-sm">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{author.name}</h2>
                      {author.description && <p className="text-sm text-muted-foreground mt-1">{author.description}</p>}
                    </div>
                  </div>
                  {renderBookGrid(books.filter(b => b.author_id === author.id))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}