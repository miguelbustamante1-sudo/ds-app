/**
 * DTOs for TimeOff entity
 */

/**
 * TimeOffDTO - Full time off data returned to client
 */
export interface TimeOffDTO {
  timeOffId: number;
  teamMemberId: number | null;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: number;
  timeOffOriginalId: number | null;
  timeOffCreatedBy: number | null;
  timeOffCreatedDate: Date | null;
  timeOffLastUpdatedBy: number | null;
  timeOffLastUpdatedDate: Date | null;
  categoryId: number | null;
  timeOffActive: number;
  statusId: number | null;
}

/**
 * TimeOffWithDetailsDTO - Time off with category and status names for list display
 */
export interface TimeOffWithDetailsDTO {
  timeOffId: number;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: number;
  timeOffOriginalId: number | null;
  categoryId: number | null;
  categoryName: string;
  statusId: number | null;
  statusName: string;
}

/**
 * CreateTimeOffDTO - Data required to create a new time off request
 */
export interface CreateTimeOffDTO {
  teamMemberId: number | null;
  timeOffStartDate: Date | string;
  timeOffEndDate: Date | string;
  timeOffDays?: number;
  categoryId: number | null;
  statusId?: number | null;
  warningReviewComment?: string; // Accepted but not persisted yet
}

/**
 * CreateMyTimeOffDTO - Data for creating time off for current user (teamMemberId resolved server-side)
 */
export interface CreateMyTimeOffDTO {
  timeOffStartDate: Date | string;
  timeOffEndDate: Date | string;
  timeOffDays?: number;
  categoryId: number;
  warningReviewComment?: string;
}

/**
 * UpdateTimeOffDTO - Data allowed to be updated
 */
export interface UpdateTimeOffDTO {
  timeOffStartDate?: Date | string;
  timeOffEndDate?: Date | string;
  timeOffDays?: number;
  categoryId?: number | null;
  statusId?: number | null;
  timeOffActive?: number;
}

/**
 * CreateSupervisorTimeOffDTO - Data for supervisors creating time off on behalf of team members
 */
export interface CreateSupervisorTimeOffDTO {
  teamMemberId: number;
  timeOffStartDate: Date | string;
  timeOffEndDate: Date | string;
  timeOffDays?: number;
  categoryId: number;
  comment?: string;
}

/**
 * CancelSupervisorTimeOffDTO - Data for supervisors cancelling time off requests
 */
export interface CancelSupervisorTimeOffDTO {
  comment: string;
}

/**
 * UpdateSupervisorTimeOffDTO - Data for supervisors editing time off on behalf of team members
 */
export interface UpdateSupervisorTimeOffDTO {
  timeOffStartDate: Date | string;
  timeOffEndDate: Date | string;
  timeOffDays?: number;
  categoryId: number;
  comment?: string;
}

/**
 * CancelMyTimeOffDTO - Data for cancelling own time off request
 */
export interface CancelMyTimeOffDTO {
  comment: string;
}

/**
 * UpdateMyTimeOffDTO - Data for editing own time off request
 */
export interface UpdateMyTimeOffDTO {
  timeOffStartDate: Date | string;
  timeOffEndDate: Date | string;
  timeOffDays?: number;
  categoryId: number;
  comment?: string;
}

/**
 * TimeOffByMonthDTO - Aggregated time-off days by month for charts
 */
export interface TimeOffByMonthDTO {
  month: string;
  days: number;
}
