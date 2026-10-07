import React from "react";
import { UserRound } from "lucide-react";
import SectionHeader from "@/components/browse/SectionHeader";
import StatusBadge from "@/components/browse/StatusBadge";
import { isExclusiveAuthor } from "@/lib/bookUtils";

export default function AuthorBrowser({ authors, books, selected, onSelect }) {
  const available = authors.filter((a) => books.some((b) => b.author_id === a.id));
  if (!available.length) return null;
  return (
    <section className="xero-section">
      <SectionHeader title="Browse by Author" />
      <div className="flex flex-wrap gap-3">
        <button onClick={() => onSelect("all")} className={`rounded-xl border px-5 py-4 text-sm font-semibold ${selected === "all" ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-foreground"}`}>All authors</button>
        {available.map((author) => <button key={author.id} onClick={() => onSelect(author.id)} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${selected === author.id ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
          {author.avatar_url ? <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><UserRound className="h-4 w-4 text-muted-foreground" /></span>}
          <div><p className="text-sm font-semibold">{author.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{books.filter((b) => b.author_id === author.id).length} titles</p></div>
          {isExclusiveAuthor(author) && <StatusBadge status="EXCLUSIVE" />}
        </button>)}
      </div>
    </section>
  );
}