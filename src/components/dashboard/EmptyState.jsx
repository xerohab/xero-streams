import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function EmptyState({ icon: Icon, title, text, ctaTo, ctaLabel = "Browse Content" }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
      <h3 className="mb-1 text-base font-bold text-foreground">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{text}</p>
      {ctaTo && (
        <Link to={ctaTo}>
          <Button className="mt-5" variant="outline">{ctaLabel}</Button>
        </Link>
      )}
    </div>
  );
}