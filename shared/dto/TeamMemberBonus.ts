/**
 * DTOs for Team Member Bonus
 * Maps to ds.tmb_team_member_bonus
 */

import type { BonusCategoryDTO } from './BonusCategory';

export interface TeamMemberBonusTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export type TeamMemberBonusCategoryInfo = BonusCategoryDTO;

export interface TeamMemberBonusDTO {
  teamMemberBonusId: number;
  teamMemberId: number;
  bonusCategoryId: number;
  bonusAmount: string; // Prisma Decimal serializes to string over JSON
  bonusPeriodicity: string;
  bonusStartDate: string | null;
  bonusEndDate: string | null;
  bonusCreatedBy: number;
  bonusCreatedAt: string;
  bonusUpdatedBy: number | null;
  bonusUpdatedAt: string | null;
  teamMember: TeamMemberBonusTeamMemberInfo | null;
  bonusCategory: TeamMemberBonusCategoryInfo | null;
}

/**
 * CreateTeamMemberBonusDTO
 * Excludes: teamMemberBonusId (auto), audit fields (server-populated), expanded relations (read-only)
 */
export interface CreateTeamMemberBonusDTO {
  teamMemberId: number;
  bonusCategoryId: number;
  bonusAmount: number;
  bonusPeriodicity: string;
  bonusStartDate?: string | null;
  bonusEndDate?: string | null;
}

/**
 * UpdateTeamMemberBonusDTO
 * All fields optional; excludes id and audit fields
 */
export interface UpdateTeamMemberBonusDTO {
  bonusCategoryId?: number;
  bonusAmount?: number;
  bonusPeriodicity?: string;
  bonusStartDate?: string | null;
  bonusEndDate?: string | null;
}
