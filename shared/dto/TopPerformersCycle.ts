/**
 * DTOs for Top Performers Cycle
 * Maps to ds.cyc_cycles
 */

export interface TpCycleDTO {
  cycId: number;
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
  cycStatus: string;
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
  cycStatus: string;
}
