/**
 * Builds the (taskReferenceType, taskReferenceId) identity used to dedupe a
 * flag against an already-open task, so re-submitting the same weekly export
 * doesn't pile up duplicate tasks for issues that are still unresolved.
 *
 * Digits inside the row's raw description are replaced with '#' so that a
 * changing day/week count (e.g. "after 26 days" -> "after 33 days" for the
 * same still-open case) doesn't defeat the dedupe — while genuinely distinct
 * issue types under the same Report (e.g. "Missing Passport information" vs
 * "Missing Visa information") stay distinct, since their non-numeric text
 * differs.
 */

const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizeIssueText(concatenate: string): string {
  return concatenate
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

export const FLAG_INTAKE_TASK_REFERENCE_TYPE = 'FLAG_INTAKE';

/**
 * `taskReferenceType` is free text (an admin can type anything into the
 * Reference Type field on the manual task dialog). Any task whose
 * `taskReferenceType` *contains* this keyword — 'FLAG_INTAKE' from CSV
 * intake, plain 'FLAG' from the manual dialog, or any future flag-related
 * value — is treated as a flag: routed to the dashboard's Weekly Flags panel
 * and excluded from the personal to-do inbox.
 */
export const FLAG_TASK_REFERENCE_TYPE_KEYWORD = 'FLAG';

export function buildFlagReferenceKey(workdayId: string, report: string, concatenate: string): string {
  return `${workdayId}:${report.trim().toLowerCase()}:${normalizeIssueText(concatenate)}`;
}
