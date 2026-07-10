export interface WorkdayBalanceValidationResult {
  valid: boolean;
  errorMessage: string | null;
  available: number;
}

// Guatemala vacation accrual: 1.25 days per completed calendar month since 2025-12-31
const GT_ACCRUAL_BASE_YEAR = 2025;
const GT_ACCRUAL_BASE_MONTH = 11; // December (0-indexed)
const GT_ACCRUAL_RATE = 1.25;

/**
 * Computes accrued Guatemala vacation days based on completed months since 2025-12-31.
 * Each full calendar month that has ended before the request's start month earns 1.25 days.
 *
 * Examples (base = Dec 31, 2025):
 *   start = Jan 2026 → 0 completed months → 0 days
 *   start = Mar 2026 → Jan + Feb = 2 months → 2.5 days
 *   start = Jun 2026 → Jan–May = 5 months → 6.25 days
 */
export function computeGTAccruedVacationDays(requestStartDate: Date): number {
  const reqYear = requestStartDate.getFullYear();
  const reqMonth = requestStartDate.getMonth();
  const completedMonths = (reqYear - GT_ACCRUAL_BASE_YEAR) * 12 + reqMonth - (GT_ACCRUAL_BASE_MONTH + 1);
  if (completedMonths <= 0) return 0;
  return completedMonths * GT_ACCRUAL_RATE;
}

/**
 * Validates whether a requested number of days fits within the user's workday balance
 * for the selected category.
 *
 * - "vacation" → checks balance.vacation
 * - "personal day" / "personal days" → checks balance.personalDays
 * - Any other category (or undefined) → always valid, no balance check
 *
 * @param categoryName - The name of the selected time-off category
 * @param requestedDays - Number of days being requested
 * @param balance - The user's current workday balance, or null if not loaded
 */
export function validateWorkdayBalance(
  categoryName: string | undefined,
  requestedDays: number,
  balance: { vacation: number; personalDays: number } | null
): WorkdayBalanceValidationResult {
  const name = categoryName?.toLowerCase().trim();

  let available: number;

  if (name === 'vacation') {
    available = balance?.vacation ?? 0;
  } else if (name === 'personal day' || name === 'personal days') {
    available = balance?.personalDays ?? 0;
  } else {
    return { valid: true, errorMessage: null, available: 0 };
  }

  if (requestedDays <= available) {
    return { valid: true, errorMessage: null, available };
  }

  return {
    valid: false,
    errorMessage: `Insufficient balance. Requested: ${requestedDays} days, Available: ${available} days.`,
    available,
  };
}
