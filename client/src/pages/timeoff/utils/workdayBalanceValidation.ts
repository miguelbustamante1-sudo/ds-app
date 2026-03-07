export interface WorkdayBalanceValidationResult {
  valid: boolean;
  errorMessage: string | null;
  available: number;
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
