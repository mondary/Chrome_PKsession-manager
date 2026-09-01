import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input type={type} className={cn('h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50', className)} {...props} />; }
