import React from "react";

export default function MediaCardFooter({ title, meta }) {
  const items = Array.isArray(meta) ? meta.filter(Boolean) : meta ? [meta] : [];
  return (
    <div className="flex flex-1 flex-col border-t border-border/50 bg-card px-2 py-2">
      <h3 className="line-clamp-2 min-h-[2.4em] text-[11.5px] font-semibold leading-tight text-foreground group-hover:text-primary group-focus-within:text-primary">{title}</h3>
      <div className="mt-1 flex min-h-4 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[9.5px] font-medium text-muted-foreground">
        {items.map((item, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden="true">·</span>}<span className="inline-flex min-w-0 items-center gap-1 truncate">{item}</span></React.Fragment>)}
      </div>
    </div>
  );
}