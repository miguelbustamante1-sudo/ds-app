import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Parses a UTC date (string or Date) and returns a Date representing the same
 * calendar date in local time. This prevents timezone shifts when displaying
 * date-only values stored as UTC midnight.
 *
 * Example: "2026-03-05T00:00:00Z" → Date for March 5, 2026 (local)
 *
 * @param dateInput - UTC ISO date string or Date object
 * @returns Date object representing the same calendar date in local time
 */
export function parseUTCDateAsLocal(dateInput: string | Date): Date {
  const isoString = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();
  const datePart = isoString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a UTC date (string or Date) for display, preserving the original calendar date.
 * Combines parseUTCDateAsLocal with date-fns format for convenience.
 *
 * @param dateInput - UTC ISO date string or Date object
 * @param formatStr - date-fns format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatUTCDate(dateInput: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  return format(parseUTCDateAsLocal(dateInput), formatStr);
}
