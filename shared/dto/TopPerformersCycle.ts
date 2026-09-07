/**
 * DTOs for Top Performers Cycle
 * Maps to ds.cyc_cycles
 */

/**
 * Ordered list of all valid cycle statuses.
 * This is the single source of truth — import from here, never hardcode.
 */
export const TP_CYCLE_STATUSES = [
  'DRAFT',
  'NOMINATIONS_OPEN',
  'NOMINATIONS_CLOSED',
  'VOTING_OPEN',
  'VOTING_CLOSED',
  'RESULTS_PUBLISHED',
] as const;

export type TpCycleStatus = (typeof TP_CYCLE_STATUSES)[number];

export interface TpCycleDTO {
  cycId: number;
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
  cycStatus: TpCycleStatus;
  cycCreatedDate: string;
}

/**
 * CreateTpCycleDTO
 * Excludes: cycId (auto), audit fields (server-populated)
 */
export interface CreateTpCycleDTO {
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
}

/**
 * UpdateTpCycleStatusDTO
 * Purpose-named DTO for the PATCH /:id/status endpoint
 */
export interface UpdateTpCycleStatusDTO {
  cycStatus: TpCycleStatus;
}

/**
 * UpdateTpCycleDTO
 * Used by PUT /:id — updates name and all four date fields.
 * Status is updated separately via PATCH /:id/status.
 */
export interface UpdateTpCycleDTO {
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
}
