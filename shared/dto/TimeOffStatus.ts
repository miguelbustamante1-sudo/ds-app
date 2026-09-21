/**
 * DTOs for TimeOffStatus entity
 */

/**
 * TimeOffStatusDTO - Full time off status data returned to client
 */
export interface TimeOffStatusDTO {
  statusId: number;
  statusName: string;
  statusShortName: string | null;
}

/**
 * CreateTimeOffStatusDTO - Data required to create a new time off status
 */
export interface CreateTimeOffStatusDTO {
  statusName: string;
  statusShortName?: string;
}

/**
 * UpdateTimeOffStatusDTO - Data allowed to be updated
 */
export interface UpdateTimeOffStatusDTO {
  statusName?: string;
  statusShortName?: string;
}
