import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number, showSign = true): string {
  const formatted = Math.abs(value).toFixed(2) + '%';
  if (!showSign) return formatted;
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(0);
}

export function getScoreColor(score: number): string {
  if (score >= 65) return 'text-emerald-500 dark:text-emerald-400';
  if (score <= 35) return 'text-rose-500 dark:text-rose-400';
  return 'text-amber-500 dark:text-amber-400';
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-emerald-500 dark:text-emerald-400';
  if (value < 0) return 'text-rose-500 dark:text-rose-400';
  return 'text-muted-foreground';
}
