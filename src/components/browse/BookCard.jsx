import React from "react";
import { BookOpen, Download, Loader2, ShoppingCart } from "lucide-react";
import MediaCard from "@/components/browse/MediaCard";
import StatusBadge from "@/components/browse/StatusBadge";
import { isExclusiveAuthor } from "@/lib/bookUtils";

const BTN =
  "flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bold transition-colors disabled:opacity-60";
const BUY = `${BTN} bg-primary text-primary-foreground hover:bg-primary/90`;
const OWNED = `${BTN} border border-primary/40 bg-black/60 text-primary hover:bg-primary/15`;

/**
 * Shared Book card (Books, Search, Home, My Xero).
 * - `to`: whole card links there (browse mode, no inline actions).
 * - otherwise: hover (or always-on for touch) overlay with valid buy / download actions.
 * - `onPurchase`: omit to hide Buy actions (e.g. in My Books, where only owned titles show).
 */
export default function BookCard({ book, author, purchases = [], purchasing, onPurchase, to }) {
  const bought = (format) =>
    purchases.some((p) => p.book_id === book.id && p.status === "completed" && p.format === format);
  const purchasedDefault = bought("default");
  const purchasedWord = purchasedDefault || bought("word");
  const purchasedEbook = purchasedDefault || bought("ebook");
  const isOwned = purchasedWord || purchasedEbook || purchasedDefault;
  const isExclusive = isExclusiveAuthor(author);

  const prices = [book.price_word, book.price_ebook, book.price].filter((p) => p > 0);
  const lowest = prices.length ? Math.min(...prices) : null;
  const priceLabel = isOwned || lowest === null ? null : `${new Set(prices).size > 1 ? "From " : ""}$${lowest}`;

  const buyButton = (format, label, price) => (
    <button
      key={`buy-${format}`}
      className={BUY}
      onClick={() => onPurchase(book, format)}
      disabled={purchasing === book.id + format}
    >
      {purchasing === book.id + format ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
      {label} (${price})
    </button>
  );

  const openButton = (key, label, url) => (
    <button key={key} className={OWNED} onClick={() => window.open(url, "_blank")}>
      <Download className="h-3 w-3" /> {label}
    </button>
  );

  const actions = [];
  if (!to) {
    if (book.price_word > 0) {
      if (purchasedWord) actions.push(openButton("word", "Word Doc", book.file_url_word));
      else if (onPurchase) actions.push(buyButton("word", "Buy Word", book.price_word));
    }
    if (book.price_ebook > 0) {
      if (purchasedEbook) actions.push(openButton("ebook", "Ebook", book.file_url_ebook));
      else if (onPurchase) actions.push(buyButton("ebook", "Buy Ebook", book.price_ebook));
    }
    if (!book.price_word && !book.price_ebook) {
      if (purchasedDefault || purchasedWord || purchasedEbook) {
        actions.push(openButton("default", "Download", book.file_url || book.file_url_ebook || book.file_url_word));
      } else if (onPurchase) {
        actions.push(buyButton("default", "Buy", book.price));
      }
    }
  }

  const overlay =
    !to && (actions.length > 0 || book.description) ? (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-black/95 via-black/75 to-black/30 p-2.5 opacity-0 transition-opacity duration-300 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:from-black/90 [@media(hover:none)]:via-transparent [@media(hover:none)]:to-transparent [@media(hover:none)]:opacity-100">
        {book.description && (
          <p className="mb-1 line-clamp-4 text-[10px] leading-snug text-gray-300 [@media(hover:none)]:hidden">{book.description}</p>
        )}
        {actions}
      </div>
    ) : null;

  return (
    <MediaCard
      to={to}
      image={book.cover_image}
      alt={book.title}
      title={book.title}
      FallbackIcon={BookOpen}
      meta={[author?.name || "Unknown Author", priceLabel]}
      badges={
        <>
          {isExclusive && <StatusBadge status="EXCLUSIVE" />}
          {isOwned && <StatusBadge status="OWNED" />}
        </>
      }
      posterOverlay={overlay}
    />
  );
}