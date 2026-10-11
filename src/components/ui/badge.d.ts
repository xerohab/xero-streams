import * as React from 'react';
export const Badge: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & {variant?: 'default'|'secondary'|'destructive'|'outline'}>;
export function badgeVariants(options?: {variant?: 'default'|'secondary'|'destructive'|'outline', className?: string}): string;
