const GT_COUNTRY_ISO = 'GT';
const VACATION_CATEGORY_NAME = 'Vacation';
const EXCEPTION_THRESHOLD = 5;

export interface GTExceptionWarningResult {
  showExceptionNotice: boolean;        // true when requestedDays < 5 (this request is an exception)
  showFourDayRecommendation: boolean;  // true when requestedDays === 4
  showLimitWarning: boolean;           // true when adding these days would exceed the 5-day limit
  requestedDays: number;
  exceptionDaysRemaining: number;
}

/**
 * Frontend-only soft validation for the Guatemala vacation exception rule.
 *
 * Only active when countryIso === 'GT' AND categoryName is 'Vacation'.
 * The hard block is always enforced by the backend — this is advisory only.
 */
export function validateGTVacationException(
  countryIso: string | undefined | null,
  categoryName: string | undefined,
  requestedDays: number,
  exceptionDaysRemaining: number
): GTExceptionWarningResult {
  const noWarning: GTExceptionWarningResult = {
    showExceptionNotice: false,
    showFourDayRecommendation: false,
    showLimitWarning: false,
    requestedDays,
    exceptionDaysRemaining,
  };

  if (
    countryIso?.toUpperCase() !== GT_COUNTRY_ISO ||
    categoryName?.trim().toLowerCase() !== VACATION_CATEGORY_NAME.toLowerCase()
  ) {
    return noWarning;
  }

  if (requestedDays <= 0 || requestedDays >= EXCEPTION_THRESHOLD) {
    return noWarning;
  }

  return {
    showExceptionNotice: true,
    showFourDayRecommendation: requestedDays === 4,
    showLimitWarning: requestedDays > exceptionDaysRemaining,
    requestedDays,
    exceptionDaysRemaining,
  };
}
