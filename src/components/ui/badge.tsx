import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium', { variants: { variant: { default: 'border-transparent bg-primary text-primary-foreground', secondary: 'border-transparent bg-secondary text-secondary-foreground', outline: 'text-foreground', success: 'border-emerald-200 bg-emerald-50 text-emerald-700', warning: 'border-amber-200 bg-amber-50 text-amber-700' } }, defaultVariants: { variant: 'secondary' } });
export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant }), className)} {...props} />; }
