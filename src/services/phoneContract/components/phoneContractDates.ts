/**
 * Compute the contract end date given a start date string and duration in months.
 * Formula: last calendar day before the month-offset rolls over.
 * E.g. start = 2025-01-15, months = 12 → end = 2026-01-14
 *
 * This is the single source of truth for end-date arithmetic across create and renew.
 */
export function computeContractEnd(startDateStr: string, contractMonths: number): Date {
  const year  = parseInt(startDateStr.slice(0, 4), 10);
  const month = parseInt(startDateStr.slice(5, 7), 10);
  const day   = parseInt(startDateStr.slice(8, 10), 10);
  return new Date(Date.UTC(year, month - 1 + contractMonths, day - 1));
}

/** UTC-midnight Date representing today — used for isActive comparisons. */
export function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
