/**
 * DTOs for Compensatory Time
 */

import type { TeamMemberDTO } from './TeamMember';

export type CompStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type CompType   = 'EARNED' | 'USED';

/**
 * CompensatoryTimeDTO - Full compensatory time record returned to client.
 */
export interface CompensatoryTimeDTO {
  compensatoryTimeId: number;
  startingTime:       Date;
  endingTime:         Date;
  subject:            string;
  status:             CompStatus;
  compType:           CompType;
  deleted:            boolean;
  teamMemberId:       TeamMemberDTO['teamMemberId'];
  teamMemberName?:    string;
  projectId:          number;
  projectName?:       string;
  dayHours:             number;
  nightHours:           number;
  nightMultipliedHours: number;
  totalCreditedHours:   number;
  createdBy:            string;
  createdDate:          Date;
  rejectionReason:      string;
  reportLevel?:         number;
}

/**
 * CreateCompensatoryTimeDTO - Data required to create a new compensatory time record.
 * Excludes:
 * - compensatoryTimeId (auto-generated)
 */
export interface CreateCompensatoryTimeDTO {
  startingTime: Date | string;
  endingTime:   Date | string;
  subject:      string;
  teamMemberId: TeamMemberDTO['teamMemberId'];
  projectId:    number;
  nightHours:   number;
}

/**
 * UpdateCompensatoryTimeDTO - Data allowed to be updated.
 * Excludes:
 * - compensatoryTimeId (immutable)
 */
export interface UpdateCompensatoryTimeDTO {
  startingTime?:    Date | string;
  endingTime?:      Date | string;
  subject?:         string;
  status?:          CompStatus;
  rejectionReason?: string;
  compType?:        CompType;
  deleted?:         boolean;
  teamMemberId?:    TeamMemberDTO['teamMemberId'];
  projectId?:       number;
}
