import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BookCard from "@/components/browse/BookCard";
import HomeSectionHeader from "@/components/browse/HomeSectionHeader";

/** Home "Books" teaser: shared BookCard in link mode, opens the Books page. */
export default function HomeBooksRow() {
  const { data: books = [] } = useQuery({
    queryKey: ["home_books", 7],
    queryFn: () => base44.entities.Book.filter({ is_active: true }, "sort_order", 7),
  });
  const { data: authors = [] } = useQuery({
    queryKey: ["book_authors"],
    queryFn: () => base44.entities.BookAuthor.list(),
  });

  if (books.length === 0) return null;

  return (
    <section className="home-section home-book-section" id="home-books" data-home-count={Math.min(7, books.length)}>
      <HomeSectionHeader title="Books" to="/books" />
      <div className="home-poster-grid home-book-grid">
        {books.slice(0, 7).map((book) => <BookCard key={book.id} book={book} author={authors.find((a) => a.id === book.author_id)} to="/books" />)}
      </div>
    </section>
  );
}