import React from "react";
import { Book } from "lucide-react";
import BookCard from "@/components/browse/BookCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

export default function MyBooksSection({ bookPurchases, books, authors }) {
  const ownedIds = [...new Set(bookPurchases.map((p) => p.book_id))];
  const owned = ownedIds.map((id) => books.find((b) => b.id === id)).filter(Boolean);

  return (
    <section>
      <SectionHeader title="My Books" />
      {owned.length === 0 ? (
        <EmptyState icon={Book} title="No books yet" text="Books you buy from the library appear here, ready to download." ctaTo="/books" ctaLabel="Browse Books" />
      ) : (
        <MediaGrid>
          {owned.map((book) => (
            <BookCard key={book.id} book={book} author={authors.find((a) => a.id === book.author_id)} purchases={bookPurchases} />
          ))}
        </MediaGrid>
      )}
    </section>
  );
}