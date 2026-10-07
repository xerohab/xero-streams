import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import BookCard from "@/components/browse/BookCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import { Loader2 } from "lucide-react";
import BooksHero from "@/components/browse/BooksHero";
import AuthorBrowser from "@/components/browse/AuthorBrowser";
import { isExclusiveAuthor } from "@/lib/bookUtils";
import toast from "react-hot-toast";

export default function Books() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [selectedAuthor, setSelectedAuthor] = useState("all");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.filter({ is_active: true }, "sort_order", 1000)
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
    .slice(0, 7);
  const allBooks = selectedAuthor === "all" ? books : books.filter((b) => b.author_id === selectedAuthor);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <BooksHero books={books} authors={authors} />

      <main className="xero-container flex-1 pb-16 pt-6">
        {isLoading || loadingAuthors ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No books available at the moment.</div>
        ) : (
          <div>
            {exclusiveBooks.length > 0 && (
              <section className="xero-section">
                <SectionHeader title="Xero Streams Exclusives" subtitle={`Only on Xero Streams: ${exclusiveAuthorNames.join(", ")}`} />
                {renderBooks(exclusiveBooks)}
              </section>
            )}

            {recentBooks.length > 0 && (
              <section className="xero-section">
                <SectionHeader title="Recently Added" />
                {renderBooks(recentBooks)}
              </section>
            )}

            <AuthorBrowser authors={authors} books={books} selected={selectedAuthor} onSelect={setSelectedAuthor} />
            <section className="xero-section" id="all-books">
              <SectionHeader title="All Books" subtitle={selectedAuthor === "all" ? `${books.length} available titles` : authors.find((a) => a.id === selectedAuthor)?.name} />
              {renderBooks(allBooks)}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}