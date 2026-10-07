import React from "react";
import { BookOpen } from "lucide-react";
import StatusBadge from "@/components/browse/StatusBadge";
import { isExclusiveAuthor } from "@/lib/bookUtils";

export default function BooksHero({ books, authors }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-border/50 bg-background">
      <img src="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070&auto=format&fit=crop" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background to-transparent" />
      <div className="xero-container flex items-center justify-between gap-8 pb-8 pt-24 md:pb-10 md:pt-28">
        <div className="max-w-xl space-y-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary"><BookOpen className="h-4 w-4" />The Xero Library</div><h1 className="text-4xl font-black tracking-tight md:text-5xl">Books</h1><p className="text-sm leading-relaxed text-foreground/70 md:text-[15px]">Discover your next story. Browse books available through Xero Streams, including exclusive titles.</p><div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span>{books.length} titles</span><span>{authors.length} authors</span>{authors.some((author) => isExclusiveAuthor(author) && books.some((book) => book.author_id === author.id)) && <StatusBadge status="EXCLUSIVE" />}</div></div>
        <div className="hidden items-end gap-3 md:flex" aria-hidden="true">{books.filter((b) => b.cover_image).slice(0, 3).map((book, i) => <img key={book.id} src={book.cover_image} alt="" className={`w-24 rounded-lg border border-border object-cover shadow-2xl lg:w-32 ${i === 1 ? "-translate-y-4" : ""}`} />)}</div>
      </div>
    </header>
  );
}