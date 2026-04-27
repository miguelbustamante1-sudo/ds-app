/**
 * DTOs for HolidaySwap entity
 */

export interface HolidaySwapDTO {
  holidaySwapId: number;
  teamMemberId: number;
  holidayId: number;
  holidayName: string;
  originalDate: Date | string;
  replacementDate: Date | string;
  statusId: number;
  statusName: string;
  active: boolean;
  createdBy: string | null;
  createdAt: Date | string | null;
}

export interface CreateHolidaySwapDTO {
  holidayId: number;
  replacementDate: Date | string;
}

export interface ReviewHolidaySwapDTO {
  statusId: number;
  comment?: string;
}

export interface CancelHolidaySwapDTO {
  comment?: string;
}

export interface UpdateHolidaySwapDTO {
  holidayId: number;
  replacementDate: Date | string;
}

export interface CreateExceptionHolidaySwapDTO {
  holidayId: number;
  replacementDate: Date | string;
  onBehalfOf: number; // ds.tbl_users.usr_id of the selected supervisor
}

export interface ActiveSwapSummaryDTO {
  holidaySwapId: number;
  holidayId: number;
  holidayName: string;
  originalDate: string; // ISO date string (UTC midnight)
  replacementDate: string; // ISO date string (UTC midnight)
}

export interface HolidaySwapDetailDTO {
  holidaySwapId: number;
  teamMemberId: number;
  teamMemberName: string; // teamMemberNames + ' ' + teamMemberSurnames
  holidayId: number;
  holidayName: string;
  originalDate: string; // ISO date string (UTC midnight)
  replacementDate: string; // ISO date string (UTC midnight)
  statusId: number;
  statusName: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  role: 'employee' | 'supervisor';
  availableActions: Array<'cancel' | 'approve' | 'reject'>;
}
