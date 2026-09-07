/**
 * Any status except these three counts as "active" for hub summary purposes:
 * 4 = Cancelled, 5 = Rejected, 6 = Split. Same convention as
 * src/services/dashboard/getDashboardImportantDates.ts.
 */
export const TIME_OFF_HUB_EXCLUDED_STATUS_IDS = [4, 5, 6];
