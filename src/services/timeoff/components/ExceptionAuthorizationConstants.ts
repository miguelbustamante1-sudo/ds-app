/**
 * Shared identifiers for the time-off "exception authorization" workflow —
 * a request that fails the days-before notice policy is saved as InAuth and
 * routed through this workflow template instead of being blocked outright.
 *
 * These string/id values are the coupling point between this code and the
 * template authored in /admin/workflow/templates — they must match exactly
 * what's configured there (outcome codes, template code).
 */

/** Code of the published workflow template that runs this flow. */
export const TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE = 'TIMEOFF_EXCEPTION_AUTH';

/** Outcome codes on the Authorize Exception task. */
export const AUTHORIZE_EXCEPTION_OUTCOME_APPROVED = 'APPROVED';
export const AUTHORIZE_EXCEPTION_OUTCOME_REJECTED = 'REJECTED';

/**
 * Time-off status ids relevant to this flow (ds.tbl_to_statuses).
 * 7 ("InAuth") exists in the live DB but is not present in scripts/seed.sql.
 */
export const TIMEOFF_STATUS_IN_AUTH = 7; // 'InAuth'
export const TIMEOFF_STATUS_TENTATIVE = 1; // 'Tentative' — normal starting status
export const TIMEOFF_STATUS_REJECTED = 5; // 'Rejected'
