import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
        outline: 'border border-border text-foreground',
        success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        bullish: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        bearish: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
        pro: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0',
        enterprise: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0',
        free: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
