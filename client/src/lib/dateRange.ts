import { DateRange } from 'react-day-picker';

const STORAGE_KEY = 'dashboard-date-range';

/**
 * Gets the current quarter's date range.
 * Q1: Jan 1 - Mar 31, Q2: Apr 1 - Jun 30, Q3: Jul 1 - Sep 30, Q4: Oct 1 - Dec 31
 */
export function getCurrentQuarterRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  const quarterStartMonth = quarter * 3;
  const quarterEndMonth = quarterStartMonth + 2;

  const from = new Date(year, quarterStartMonth, 1);
  const to = new Date(year, quarterEndMonth + 1, 0); // Last day of quarter end month

  return { from, to };
}

/**
 * Gets the previous quarter's date range.
 */
export function getLastQuarterRange(): DateRange {
  const now = new Date();
  let year = now.getFullYear();
  const month = now.getMonth();
  let quarter = Math.floor(month / 3) - 1;

  // Handle Q1 -> previous year Q4
  if (quarter < 0) {
    quarter = 3;
    year -= 1;
  }

  const quarterStartMonth = quarter * 3;
  const quarterEndMonth = quarterStartMonth + 2;

  const from = new Date(year, quarterStartMonth, 1);
  const to = new Date(year, quarterEndMonth + 1, 0);

  return { from, to };
}

/**
 * Gets the current year's full date range (Jan 1 - Dec 31).
 */
export function getCurrentYearRange(): DateRange {
  const year = new Date().getFullYear();
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);

  return { from, to };
}

/**
 * Gets the year-to-date range (Jan 1 - Today).
 */
export function getYearToDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const from = new Date(year, 0, 1);
  const to = now;

  return { from, to };
}

/**
 * Saves the date range to localStorage.
 */
export function saveDateRangeToStorage(range: DateRange): void {
  if (!range.from || !range.to) return;

  const data = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Loads the date range from localStorage.
 * Returns null if no valid range is stored.
 */
export function loadDateRangeFromStorage(): DateRange | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    if (!data.from || !data.to) return null;

    const from = new Date(data.from);
    const to = new Date(data.to);

    // Validate dates are valid
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;

    return { from, to };
  } catch {
    return null;
  }
}

/**
 * Clears the stored date range from localStorage.
 */
export function clearDateRangeStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Preset options for quick date range selection.
 */
export const DATE_RANGE_PRESETS = [
  { label: 'This Quarter', getValue: getCurrentQuarterRange },
  { label: 'Last Quarter', getValue: getLastQuarterRange },
  { label: 'This Year', getValue: getCurrentYearRange },
  { label: 'YTD', getValue: getYearToDateRange },
] as const;
