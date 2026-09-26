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
export function formatUTCDate(dateInput: string | Date, formatStr: string = 'dd-MMM-yyyy'): string {
  return format(parseUTCDateAsLocal(dateInput), formatStr);
}

/**
 * Formats a genuine timestamp (not a date-only value) for display, in the
 * viewer's local timezone. Unlike formatUTCDate/parseUTCDateAsLocal — which
 * deliberately zero out the time to avoid shifting a date-only value across
 * a timezone boundary — this preserves the actual time-of-day, since the
 * hour/minute of a real timestamp (e.g. a workflow task's dueAt) is itself
 * meaningful and must not be dropped.
 *
 * @param dateInput - UTC ISO datetime string or Date object
 * @param formatStr - date-fns format string (default: 'dd-MMM-yyyy HH:mm')
 * @returns Formatted date-time string
 */
export function formatUTCDateTime(dateInput: string | Date, formatStr: string = 'dd-MMM-yyyy HH:mm'): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return format(date, formatStr);
}

/**
 * Returns the preferred display name for a team member.
 *
 * Currently returns the formal full name (names + surnames). When the DB team
 * adds tms_short_name (see ds-app/prisma/scripts/add_tms_short_name.sql) and
 * the field is added to TeamMemberDTO, update the signature to accept
 * `teamMemberShortName?: string | null` and use it as the primary value.
 *
 * Use this helper across DataGrids, dropdowns, and labels instead of
 * repeating `${m.teamMemberNames} ${m.teamMemberSurnames}` inline.
 */
export function getTeamMemberDisplayName(member: {
  teamMemberNames: string;
  teamMemberSurnames: string;
}): string {
  return `${member.teamMemberNames} ${member.teamMemberSurnames}`;
}
