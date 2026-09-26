/**
 * Shared identifiers for the holiday swap "exception authorization" workflow —
 * a swap that fails a rule eligible for exception handling (currently: the
 * original holiday date has already passed) is saved as InAuth and routed
 * through this workflow template instead of being blocked outright.
 *
 * One template/handler pair is shared across every holiday-swap exception
 * reason — approving always returns the swap to normal Pending review,
 * rejecting always rejects it — so a future exception-eligible rule only
 * needs its own gate check in the orchestrator, not new workflow plumbing.
 *
 * These string values are the coupling point between this code and the
 * template authored in /admin/workflow/templates — they must match exactly
 * what's configured there (outcome codes, template code).
 */

/** Code of the published workflow template that runs this flow. */
export const HOLIDAY_SWAP_EXCEPTION_AUTH_TEMPLATE_CODE = 'HOLIDAY_SWAP_EXCEPTION_AUTH';

/** Outcome codes on the Authorize Exception task. */
export const AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED = 'APPROVED';
export const AUTHORIZE_SWAP_EXCEPTION_OUTCOME_REJECTED = 'REJECTED';
