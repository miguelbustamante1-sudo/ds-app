export type UpcomingVacationType = 'Time Off' | 'Holiday Swap';

export interface UpcomingVacationRowDTO {
  workdayId: string | null;
  fullName: string;
  email: string | null;
  type: UpcomingVacationType;
  category: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  status: string;
  days: number;
}

export interface UpcomingVacationQueryDTO {
  teamMemberId?: string;
  days?: string;
}
