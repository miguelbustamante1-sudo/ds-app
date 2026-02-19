/**
 * DTOs for Hiring entity
 */

import type { EndorsementWithDetailsDTO } from './Endorsement';

/**
 * HiringDTO - Full hiring record returned to the client, with nested endorsement detail
 */
export interface HiringDTO {
  id: number;
  endorsementId: number;
  startDate: string;
  billableDate: string;
  workdayId: string | null;
  currencySymbol: string | null;
  status: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  comment: string | null;
  endorsement: EndorsementWithDetailsDTO;
}

/**
 * CreateHiringDTO - Payload sent when the Team Leader clicks "Draft Hiring"
 */
export interface CreateHiringDTO {
  endorsementId: number;
  startDate: string;
  billableDate: string;
  workdayId?: string | null;
  currencySymbol?: string | null;
}

/**
 * UpdateHiringDTO - Payload sent when the Team Leader clicks "Execute". All fields optional for partial updates.
 */
export interface UpdateHiringDTO {
  startDate?: string;
  billableDate?: string;
  workdayId?: string | null;
  currencySymbol?: string | null;
}
