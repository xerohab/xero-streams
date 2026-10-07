import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BookCard from "@/components/browse/BookCard";
import MediaGrid from "@/components/browse/MediaGrid";
import SectionHeader from "@/components/browse/SectionHeader";

/** Home "Books" teaser: shared BookCard in link mode, opens the Books page. */
export default function HomeBooksRow() {
  const { data: books = [] } = useQuery({
    queryKey: ["home_books"],
    queryFn: () => base44.entities.Book.filter({ is_active: true }, "sort_order", 14),
  });
  const { data: authors = [] } = useQuery({
    queryKey: ["book_authors"],
    queryFn: () => base44.entities.BookAuthor.list(),
  });

  if (books.length === 0) return null;

  return (
    <section className="xero-section">
      <SectionHeader
        title="Books"
        action={
          <Link to="/books" className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">
            View All →
          </Link>
        }
      />
      <MediaGrid className="xero-home-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} author={authors.find((a) => a.id === book.author_id)} to="/books" />
        ))}
      </MediaGrid>
    </section>
  );
}