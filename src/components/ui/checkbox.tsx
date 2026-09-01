import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) { return <CheckboxPrimitive.Root className={cn('peer size-4 shrink-0 rounded border border-input bg-background shadow-xs outline-none data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/30', className)} {...props}><CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>; }
