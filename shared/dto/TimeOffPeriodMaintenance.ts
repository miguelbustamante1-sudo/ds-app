export interface TimeOffPeriodMaintenanceDTO {
  timeOffId: number;
  teamMemberId: number | null;
  teamMemberNames: string | null;
  teamMemberSurnames: string | null;
  workdayId: string | null;
  timeOffStartDate: string;
  timeOffEndDate: string;
  timeOffDays: number;
  statusName: string | null;
  timeOffPeriod: string | null;
  timeOffBackfilled: number;
}

export interface UpdateTimeOffPeriodMaintenanceDTO {
  timeOffPeriod: string | null;
  timeOffBackfilled: number;
}
