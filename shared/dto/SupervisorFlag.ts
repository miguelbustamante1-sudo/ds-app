/**
 * Supervisor Flag DTO
 *
 * Contract for the dashboard "Weekly Flags" panel. Read-only (no
 * Create/Update DTOs) — flags are sourced from `StandaloneTask` rows whose
 * taskReferenceType contains 'FLAG' (e.g. 'FLAG_INTAKE' from CSV intake, or
 * plain 'FLAG' from the manual task dialog), scoped server-side to the
 * caller's own direct reports (see getSupervisorFlags). There is no per-user
 * filtering left to do on the frontend.
 *
 * `weeksOpen` is the age of the flag in weeks: 0 = on-time (green), 1+ = overdue (red).
 *
 * `detail` is the structured facts extracted from the flag's description
 * (e.g. "SFR Client Supervisor: Faisal Vishram"), computed once at task
 * creation by a deterministic per-category parser with an AI fallback, and
 * cached on the task — never recomputed on read. `null` for flags created
 * before this field existed (not backfilled).
 */

export interface FlagActionDTO {
  label: string;
  url: string;
}

export interface FlagDetailItemDTO {
  label: string;
  value: string;
}

export interface SupervisorFlagDTO {
  id: string;
  category: string;
  teamMember: string;
  workdayId: string;
  issue: string;
  weeksOpen: number;
  /**
   * Admin-configured action link for this flag's category (e.g. "1o1
   * Tracking" -> the Monday.com Staff Tasks Board), resolved live from
   * `FlagTypeAction` at read time — not stored on the task — so a corrected
   * link reaches every currently-open flag immediately. `null` when no
   * action is configured for this category.
   */
  action: FlagActionDTO | null;
  detail: FlagDetailItemDTO[] | null;
  /**
   * The flagged member's Team Leader name, falling back to their OM name
   * when there is no Team Leader — resolved live from
   * `ds.hbt_hierarchy_by_teammember` at read time (see getSupervisorFlags).
   * `null` when no workday ID is available or no hierarchy row matches it.
   * Used to pre-fill the waiver request form from the resolution drawer.
   */
  tlOmName: string | null;
}
