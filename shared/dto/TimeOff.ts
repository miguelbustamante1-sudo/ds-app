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
 * TimeOffDetailDTO - Full detail of a single time-off request for the detail page
 */
export interface TimeOffDetailDTO {
  timeOffId: number;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: number;
  categoryId: number | null;
  categoryName: string;
  statusId: number | null;
  statusName: string;
  teamMemberName: string;
  role: 'owner' | 'supervisor';
  availableActions: ('acknowledge' | 'decline' | 'cancel')[];
  changeLogs: {
    changeLogId: number;
    changeLogComment: string;
    changeLogCreatedBy: number | null;
    changeLogCreatedDate: Date | null;
    createdByUserName: string | null;
  }[];
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

/**
 * TimeOffByCountryDTO - Aggregated time-off days by country for charts
 */
export interface TimeOffByCountryDTO {
  country: string;
  countryIso: string | null;
  days: number;
}

/**
 * TeamMemberOnTimeOffDTO - Team member info for current month time-off card
 */
export interface TeamMemberOnTimeOffDTO {
  teamMemberId: number;
  teamMemberFullName: string;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: number;
  categoryName: string;
}

/**
 * TeamTimeOffCurrentMonthDTO - Dashboard card data for current month team time-off
 */
export interface TeamTimeOffCurrentMonthDTO {
  totalDays: number;
  teamMembersCount: number;
  teamMembersOnTimeOff: TeamMemberOnTimeOffDTO[];
}

/**
 * TeamMemberYearlySummaryDTO - Team member with yearly time-off total for MyTeam table
 */
export interface TeamMemberYearlySummaryDTO {
  teamMemberId: number;
  totalDays: number;
}

/**
 * CategoryBreakdownDTO - Time-off breakdown by category
 */
export interface CategoryBreakdownDTO {
  categoryId: number;
  categoryName: string;
  totalDays: number;
}

/**
 * TeamMemberTimeOffBreakdownDTO - Detailed time-off breakdown by category for a team member
 */
export interface TeamMemberTimeOffBreakdownDTO {
  teamMemberId: number;
  year: number;
  totalDays: number;
  breakdown: CategoryBreakdownDTO[];
}

/**
 * TimeOffWithTeamMemberDTO - Time off with team member details for management grid
 */
export interface TimeOffWithTeamMemberDTO {
  timeOffId: number;
  teamMemberId: number;
  teamMemberFullName: string;
  workdayId: string;
  teamMemberEndDate: Date | null;
  countryIso: string | null;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: number;
  categoryId: number | null;
  categoryName: string;
  statusId: number | null;
  statusName: string;
}
