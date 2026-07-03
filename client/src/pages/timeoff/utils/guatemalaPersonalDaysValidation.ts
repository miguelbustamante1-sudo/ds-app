const GT_COUNTRY_ISO = 'GT';
const PERSONAL_DAY_CATEGORY_NAMES = ['personal day', 'personal days'];
const MAX_PERSONAL_DAYS_PER_MONTH = 2;

export interface GTPersonalDaysWarningResult {
  showMonthlyNotice: boolean;    // true when this request would consume from the monthly allowance
  showLimitWarning: boolean;     // true when this request would exceed the 2-day monthly limit
  requestedDays: number;
  personalDaysRemainingThisMonth: number;
}

/**
 * Frontend-only soft validation for the Guatemala Personal Days monthly limit.
 *
 * Only active when countryIso === 'GT' AND categoryName is 'Personal Day'/'Personal Days'.
 * The hard block is always enforced by the backend — this is advisory only.
 */
export function validateGTPersonalDays(
  countryIso: string | undefined | null,
  categoryName: string | undefined,
  requestedDays: number,
  personalDaysUsedThisMonth: number
): GTPersonalDaysWarningResult {
  const remaining = Math.max(0, MAX_PERSONAL_DAYS_PER_MONTH - personalDaysUsedThisMonth);

  const noWarning: GTPersonalDaysWarningResult = {
    showMonthlyNotice: false,
    showLimitWarning: false,
    requestedDays,
    personalDaysRemainingThisMonth: remaining,
  };

  if (
    countryIso?.toUpperCase() !== GT_COUNTRY_ISO ||
    !categoryName ||
    !PERSONAL_DAY_CATEGORY_NAMES.includes(categoryName.trim().toLowerCase())
  ) {
    return noWarning;
  }

  if (requestedDays <= 0) {
    return noWarning;
  }

  return {
    showMonthlyNotice: true,
    showLimitWarning: requestedDays > remaining,
    requestedDays,
    personalDaysRemainingThisMonth: remaining,
  };
}
