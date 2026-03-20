/**
 * DTOs for the Supervisor Pending Requests view.
 *
 * Discriminated union: each entity type carries only the fields that
 * belong to it.  The `type` discriminant gives the frontend full type
 * safety without resorting to optional/unknown fields.
 */

export type PendingRequestType = 'TimeOff' | 'HolidaySwap';

interface BasePendingRequest {
  type: PendingRequestType;
  entityId: number;           // PK of the underlying record
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  statusId: number;
  statusName: string;         // always "Tentative" for this view
  createdAt: string | null;
  createdBy: string | null;
}

export interface PendingTimeOffRequest extends BasePendingRequest {
  type: 'TimeOff';
  categoryName: string;
  timeOffStartDate: string;
  timeOffEndDate: string;
  timeOffDays: number;
}

export interface PendingHolidaySwapRequest extends BasePendingRequest {
  type: 'HolidaySwap';
  holidayName: string;
  originalDate: string;
  replacementDate: string;
}

export type PendingRequest = PendingTimeOffRequest | PendingHolidaySwapRequest;
