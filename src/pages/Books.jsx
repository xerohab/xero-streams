import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import BookCard from "@/components/browse/BookCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import { Loader2, BookOpen } from "lucide-react";
import { isExclusiveAuthor } from "@/lib/bookUtils";
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

  const { data: purchases = [] } = useQuery({
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

  const authorOf = (book) => authors.find((a) => a.id === book.author_id);

  const renderBooks = (list) => (
    <MediaGrid>
      {list.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          author={authorOf(book)}
          purchases={purchases}
          purchasing={purchasing}
          onPurchase={handlePurchase}
        />
      ))}
    </MediaGrid>
  );

  const exclusiveBooks = books.filter((b) => isExclusiveAuthor(authorOf(b)));
  const exclusiveAuthorNames = [...new Set(exclusiveBooks.map((b) => authorOf(b).name))];
  const recentBooks = [...books]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 14);
  const otherAuthors = authors.filter((a) => !isExclusiveAuthor(a) && books.some((b) => b.author_id === a.id));
  const booksWithoutAuthor = books.filter((b) => !authorOf(b));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Books Hero */}
      <div className="relative flex h-[32vh] min-h-[280px] w-full items-center justify-center overflow-hidden bg-black md:h-[40vh]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-25 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="relative z-10 mx-auto mt-16 max-w-3xl px-4 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/15 p-3 ring-1 ring-primary/40">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mb-3 text-4xl font-black uppercase tracking-[0.2em] text-foreground drop-shadow-xl md:text-6xl">Books</h1>
          <p className="text-sm font-medium text-muted-foreground md:text-lg">
            Discover your next story. Browse books available through Xero Streams, including exclusive titles.
          </p>
        </div>
      </div>

      <div className="xero-container relative z-20 -mt-6 flex-1 pb-20">
        {isLoading || loadingAuthors ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No books available at the moment.</div>
        ) : (
          <div className="space-y-12">
            {exclusiveBooks.length > 0 && (
              <section>
                <SectionHeader title="Xero Streams Exclusives" subtitle={`Only on Xero Streams: ${exclusiveAuthorNames.join(", ")}`} />
                {renderBooks(exclusiveBooks)}
              </section>
            )}

            {books.length > 8 && (
              <section>
                <SectionHeader title="Recently Added" />
                {renderBooks(recentBooks)}
              </section>
            )}

            {otherAuthors.map((author) => (
              <section key={author.id}>
                <SectionHeader title={author.name} subtitle={author.description} />
                {renderBooks(books.filter((b) => b.author_id === author.id))}
              </section>
            ))}

            {booksWithoutAuthor.length > 0 && (
              <section>
                <SectionHeader title="More Books" />
                {renderBooks(booksWithoutAuthor)}
              </section>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}