import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  HolidaySwapDTO,
  ReviewHolidaySwapDTO,
  CancelHolidaySwapDTO,
  UpdateHolidaySwapDTO,
} from '@shared/dto/HolidaySwap';
import type { CreateExceptionHolidaySwapDTO } from '@shared/dto/HolidaySwap';
import { loadStatusIds } from './components/LoadStatusIds';
import { validateSwapEligibilityException } from './components/ValidateSwapEligibilityException';
import { validateReplacementDay } from './components/ValidateReplacementDay';
import { getSwapsForBsa } from '../teamMember/queries/getSwapsForBsa';

const ENTITY_NAME = 'hsw_holiday_swap';

function toDTO(
  swap: {
    holidaySwapId: number;
    teamMemberId: number;
    holidayId: number;
    originalDate: Date;
    replacementDate: Date;
    statusId: number;
    active: boolean;
    createdBy: string | null;
    createdAt: Date | null;
  },
  holidayName: string,
  statusName: string
): HolidaySwapDTO {
  return {
    holidaySwapId: swap.holidaySwapId,
    teamMemberId: swap.teamMemberId,
    holidayId: swap.holidayId,
    holidayName,
    originalDate: swap.originalDate,
    replacementDate: swap.replacementDate,
    statusId: swap.statusId,
    statusName,
    active: swap.active,
    createdBy: swap.createdBy,
    createdAt: swap.createdAt,
  };
}

export class BsaHolidaySwapOrchestrator {
  /** BSA creates a swap on behalf of a supervisor/team leader */
  async createSwapException(
    targetTeamMemberId: number,
    input: CreateExceptionHolidaySwapDTO,
    bsaEmail: string
  ): Promise<HolidaySwapDTO> {
    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: targetTeamMemberId },
      select: { teamMemberId: true, countryId: true },
    });
    if (!teamMember) throw new Error('Team member not found.');
    if (!teamMember.countryId) throw new Error('Team member has no country assigned.');

    const holiday = await prisma.holiday.findUnique({
      where: { holidayId: input.holidayId },
      select: { holidayId: true, countryId: true, holidayDate: true, holidayName: true },
    });
    if (!holiday) throw new Error('Holiday not found.');

    const statusIds = await loadStatusIds();

    // Eligibility without the future-date check
    const eligibility = await validateSwapEligibilityException({
      teamMemberId: targetTeamMemberId,
      countryId: teamMember.countryId,
      holiday: {
        holidayId: holiday.holidayId,
        countryId: holiday.countryId,
        holidayDate: holiday.holidayDate,
      },
      submissionDate: new Date(),
    });
    if (!eligibility.valid) {
      throw new Error(eligibility.errorMessage ?? 'Swap eligibility check failed.');
    }

    const replacementDate = new Date(input.replacementDate);
    const replacement = await validateReplacementDay({
      teamMemberId: targetTeamMemberId,
      countryId: teamMember.countryId,
      proposedDate: replacementDate,
      originalHolidayDate: holiday.holidayDate,
    });
    if (!replacement.valid) {
      throw new Error(replacement.errorMessage ?? 'Replacement day validation failed.');
    }

    const created = await prisma.holidaySwap.create({
      data: {
        teamMemberId: targetTeamMemberId,
        holidayId: holiday.holidayId,
        statusId: statusIds.pending,
        originalDate: holiday.holidayDate,
        replacementDate,
        active: true,
        createdBy: String(input.onBehalfOf),
      },
      include: { status: { select: { statusName: true } } },
    });

    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(created.holidaySwapId),
      createdBy: bsaEmail,
      oldValues: null,
      newValues: created,
      comment: `Holiday swap exception created by ${bsaEmail} on behalf of userId ${input.onBehalfOf}`,
    });

    return toDTO(created, holiday.holidayName, created.status.statusName);
  }

  /** BSA lists all swaps for a team member (no supervisor check) */
  async getTeamMemberSwapsException(targetTeamMemberId: number): Promise<HolidaySwapDTO[]> {
    return getSwapsForBsa(targetTeamMemberId);
  }

  /** BSA updates a swap — no status block, no supervisor relationship check */
  async updateSwapException(
    swapId: number,
    input: UpdateHolidaySwapDTO,
    bsaEmail: string
  ): Promise<HolidaySwapDTO> {
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');

    const holiday = await prisma.holiday.findUnique({
      where: { holidayId: input.holidayId },
      select: { holidayId: true, countryId: true, holidayDate: true, holidayName: true },
    });
    if (!holiday) throw new Error('Holiday not found.');

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: swap.teamMemberId },
      select: { teamMemberId: true, countryId: true },
    });
    if (!teamMember?.countryId) throw new Error('Team member country not found.');

    const replacementDate = new Date(input.replacementDate);
    const replacement = await validateReplacementDay({
      teamMemberId: swap.teamMemberId,
      countryId: teamMember.countryId,
      proposedDate: replacementDate,
      originalHolidayDate: holiday.holidayDate,
      existingSwapId: swapId,
    });
    if (!replacement.valid) {
      throw new Error(replacement.errorMessage ?? 'Replacement day validation failed.');
    }

    const before = { ...swap };

    const statusIds = await loadStatusIds();

    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        holidayId: holiday.holidayId,
        originalDate: holiday.holidayDate,
        replacementDate,
        statusId: statusIds.pending,
        active: true,
        updatedBy: bsaEmail,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: bsaEmail,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap exception updated by BSA ${bsaEmail}`,
    });

    return toDTO(updated, holiday.holidayName, updated.status.statusName);
  }

  /** BSA approves or rejects — any status, no date guard */
  async reviewSwapException(
    swapId: number,
    input: ReviewHolidaySwapDTO,
    bsaEmail: string
  ): Promise<HolidaySwapDTO> {
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');

    const statusIds = await loadStatusIds();
    const isApproving = input.statusId === statusIds.approved;

    // Race-condition guard on approval
    if (isApproving) {
      const teamMember = await prisma.teamMember.findUnique({
        where: { teamMemberId: swap.teamMemberId },
        select: { countryId: true },
      });
      if (!teamMember?.countryId) throw new Error('Team member country not found.');

      const replacement = await validateReplacementDay({
        teamMemberId: swap.teamMemberId,
        countryId: teamMember.countryId,
        proposedDate: swap.replacementDate,
        originalHolidayDate: swap.originalDate,
        existingSwapId: swapId,
      });
      if (!replacement.valid) {
        throw new Error(replacement.errorMessage ?? 'Replacement day is no longer valid.');
      }
    }

    const before = { ...swap };

    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        statusId: input.statusId,
        active: isApproving,
        updatedBy: bsaEmail,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    const action = isApproving ? 'approved' : 'rejected';
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: bsaEmail,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap exception ${action} by BSA ${bsaEmail}${input.comment ? ': ' + input.comment : ''}`,
    });

    return toDTO(updated, swap.holiday.holidayName, updated.status.statusName);
  }

  /** BSA cancels — no validation, direct status update */
  async cancelSwapException(
    swapId: number,
    bsaEmail: string,
    input: CancelHolidaySwapDTO
  ): Promise<HolidaySwapDTO> {
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');

    const statusIds = await loadStatusIds();

    const before = { ...swap };

    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        statusId: statusIds.cancelled,
        active: false,
        updatedBy: bsaEmail,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: bsaEmail,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap exception cancelled by BSA ${bsaEmail}${input.comment ? ': ' + input.comment : ''}`,
    });

    return toDTO(updated, swap.holiday.holidayName, updated.status.statusName);
  }
}

export const bsaHolidaySwapOrchestrator = new BsaHolidaySwapOrchestrator();
