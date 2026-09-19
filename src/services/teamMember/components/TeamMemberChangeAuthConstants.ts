/**
 * Shared identifier for the "Team Member Change Authorization" workflow —
 * a DATABASE-execution-type example: any updateTeamMember() change is applied
 * immediately, then routed through an authorization task. APPROVED is a no-op
 * (the change already happened); REJECTED reverts it using the exact
 * aud_audits snapshot captured at the moment the change was made.
 *
 * This is the only value TypeScript hardcodes for this workflow — everything
 * else (the instantiate/outcome procedure names, the reviewer, the outcome
 * codes) is read from the template authored in /admin/workflow/templates or
 * decided inside the procedures themselves, per the DATABASE execution type
 * design: that config should live in the database, not in a code deploy.
 */

export const TEAM_MEMBER_CHANGE_AUTH_TEMPLATE_CODE = 'TEAM_MEMBER_CHANGE_AUTH';
