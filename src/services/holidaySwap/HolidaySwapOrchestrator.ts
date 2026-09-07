import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  HolidaySwapDTO,
  HolidaySwapDetailDTO,
  CreateHolidaySwapDTO,
  ReviewHolidaySwapDTO,
  CancelHolidaySwapDTO,
  UpdateHolidaySwapDTO,
} from '@shared/dto/HolidaySwap';
import { loadStatusIds } from './components/LoadStatusIds';
import { validateSwapEligibility } from './components/ValidateSwapEligibility';
import { validateReplacementDay } from './components/ValidateReplacementDay';
import { validateCancellation } from './components/ValidateCancellation';
import { notifySwapSubmitted } from './components/NotifySwapSubmitted';
import { notifySwapReviewed } from './components/NotifySwapReviewed';
import { notifySwapCancelled } from './components/NotifySwapCancelled';
import { getMySwaps } from './queries/getMySwaps';
import { getSwapsForSupervisor } from '../teamMember/queries/getSwapsForSupervisor';
import { verifySupervisorRelationship } from '../timeoff/supervisor/queries';
import { getReports } from '../teamMember/queries/getReports';

const ENTITY_NAME = 'hsw_holiday_swap';

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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
    updatedBy?: string | null;
    updatedAt?: Date | null;
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

export class HolidaySwapOrchestrator {
  /** TM submits a new swap (POST /api/holiday-swaps/my) */
  async createSwap(
    teamMemberId: number,
    input: CreateHolidaySwapDTO,
    createdBy: string
  ): Promise<HolidaySwapDTO> {
    // 1. Load TM record
    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId },
      select: { teamMemberId: true, countryId: true, teamMemberNames: true, teamMemberSurnames: true },
    });
    if (!teamMember) throw new Error('Team member not found.');
    if (!teamMember.countryId) throw new Error('Team member has no country assigned.');

    // 2. Load holiday — verify it exists and belongs to TM's country
    const holiday = await prisma.holiday.findUnique({
      where: { holidayId: input.holidayId },
      select: { holidayId: true, countryId: true, holidayDate: true, holidayName: true },
    });
    if (!holiday) throw new Error('Holiday not found.');

    // 3. Load status IDs
    const statusIds = await loadStatusIds();

    // 4. Validate eligibility
    const eligibility = await validateSwapEligibility({
      teamMemberId,
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

    // 5. Validate replacement day
    const replacementDate = new Date(input.replacementDate);
    const replacement = await validateReplacementDay({
      teamMemberId,
      countryId: teamMember.countryId,
      proposedDate: replacementDate,
      originalHolidayDate: holiday.holidayDate,
    });
    if (!replacement.valid) {
      throw new Error(replacement.errorMessage ?? 'Replacement day validation failed.');
    }

    // 6. Insert
    const created = await prisma.holidaySwap.create({
      data: {
        teamMemberId,
        holidayId: holiday.holidayId,
        statusId: statusIds.pending,
        originalDate: holiday.holidayDate,
        replacementDate,
        active: true,
        createdBy,
      },
      include: {
        status: { select: { statusName: true } },
      },
    });

    // 7. Audit log
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(created.holidaySwapId),
      createdBy,
      oldValues: null,
      newValues: created,
      comment: `Holiday swap created for ${createdBy}`,
    });

    // 8. Notify supervisor (best-effort)
    const employeeName = `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;
    notifySwapSubmitted({
      teamMemberId,
      swapId: created.holidaySwapId,
      employeeName,
      holidayName: holiday.holidayName,
      originalDate: formatDate(created.originalDate),
      replacementDate: formatDate(created.replacementDate),
    }).catch(() => {});

    return toDTO(created, holiday.holidayName, created.status.statusName);
  }

  /** TM lists their own swaps (GET /api/holiday-swaps/my) */
  async getMySwaps(teamMemberId: number): Promise<HolidaySwapDTO[]> {
    return getMySwaps(teamMemberId);
  }

  /** TM cancels a swap (PATCH /api/holiday-swaps/my/:id/cancel) */
  async cancelSwap(
    swapId: number,
    teamMemberId: number,
    updatedBy: string,
    input: CancelHolidaySwapDTO
  ): Promise<HolidaySwapDTO> {
    const statusIds = await loadStatusIds();

    // 1. Load swap + related holiday — verify ownership
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');
    if (swap.teamMemberId !== teamMemberId) throw new Error('Access denied.');

    // 2. Verify status is Pending or Approved
    if (swap.statusId !== statusIds.pending && swap.statusId !== statusIds.approved) {
      throw new Error('Only Pending or Approved swaps can be cancelled.');
    }

    // 3. Validate cancellation
    const cancellationCheck = await validateCancellation(swap);
    if (!cancellationCheck.valid) {
      throw new Error(cancellationCheck.errorMessage ?? 'Cancellation validation failed.');
    }

    const wasApproved = swap.statusId === statusIds.approved;

    // 4. Snapshot before
    const before = { ...swap };

    // 5. Update
    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        statusId: statusIds.cancelled,
        active: false,
        updatedBy,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    // 6. Audit log
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: updatedBy,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap cancelled by ${updatedBy}${input.comment ? ': ' + input.comment : ''}`,
    });

    // 7. Notify supervisor if was Approved (best-effort)
    if (wasApproved) {
      const teamMember = await prisma.teamMember.findUnique({
        where: { teamMemberId },
        select: { teamMemberNames: true, teamMemberSurnames: true },
      });
      const employeeName = teamMember
        ? `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`
        : updatedBy;

      notifySwapCancelled({
        teamMemberId,
        swapId,
        employeeName,
        holidayName: swap.holiday.holidayName,
      }).catch(() => {});
    }

    return toDTO(updated, swap.holiday.holidayName, updated.status.statusName);
  }

  /** Supervisor creates a swap on behalf of a TM (POST /api/holiday-swaps/team/:teamMemberId) */
  async createSwapForMember(
    supervisorTeamMemberId: number,
    targetTeamMemberId: number,
    input: CreateHolidaySwapDTO,
    createdBy: string
  ): Promise<HolidaySwapDTO> {
    // 1. Verify supervisor relationship
    const isSupervisor = await verifySupervisorRelationship(supervisorTeamMemberId, targetTeamMemberId);
    if (!isSupervisor) {
      throw new Error('Access denied: you are not a supervisor of this team member.');
    }

    // 2. Delegate to the same creation logic
    return this.createSwap(targetTeamMemberId, input, createdBy);
  }

  /** Supervisor views TM's swaps (GET /api/holiday-swaps/team/:teamMemberId) */
  async getTeamMemberSwaps(
    supervisorTeamMemberId: number,
    targetTeamMemberId: number
  ): Promise<HolidaySwapDTO[]> {
    return getSwapsForSupervisor(supervisorTeamMemberId, targetTeamMemberId);
  }

  /** Supervisor approves or rejects (PATCH /api/holiday-swaps/:id/review) */
  async reviewSwap(
    swapId: number,
    supervisorTeamMemberId: number,
    input: ReviewHolidaySwapDTO,
    updatedBy: string
  ): Promise<HolidaySwapDTO> {
    const statusIds = await loadStatusIds();

    // 1. Load swap — verify it is Pending
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');
    if (swap.statusId !== statusIds.pending) {
      throw new Error('Only Pending swaps can be reviewed.');
    }

    // 2. Verify requesting user is a supervisor of the TM
    const isSupervisor = await verifySupervisorRelationship(supervisorTeamMemberId, swap.teamMemberId);
    if (!isSupervisor) {
      throw new Error('Access denied: you are not a supervisor of this team member.');
    }

    const isApproving = input.statusId === statusIds.approved;

    // 3. Snapshot before
    const before = { ...swap };

    // 4. Update
    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        statusId: input.statusId,
        active: isApproving,
        updatedBy,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    // 5. Audit log
    const action = isApproving ? 'approved' : 'rejected';
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: updatedBy,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap ${action} by ${updatedBy}${input.comment ? ': ' + input.comment : ''}`,
    });

    // 7. Notify TM (best-effort)
    notifySwapReviewed({
      teamMemberId: swap.teamMemberId,
      swapId,
      holidayName: swap.holiday.holidayName,
      originalDate: formatDate(swap.originalDate),
      replacementDate: formatDate(swap.replacementDate),
      approved: isApproving,
    }).catch(() => {});

    return toDTO(updated, swap.holiday.holidayName, updated.status.statusName);
  }

  /** Supervisor updates a swap on behalf of a TM (PATCH /api/holiday-swaps/team/:id) */
  async updateSwapForMember(
    swapId: number,
    supervisorTeamMemberId: number,
    input: UpdateHolidaySwapDTO,
    updatedBy: string
  ): Promise<HolidaySwapDTO> {
    const statusIds = await loadStatusIds();

    // 1. Load swap
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');

    // 2. Block if status is Taken, Cancelled, or Rejected
    const nonEditableStatuses = [statusIds.taken, statusIds.cancelled, statusIds.rejected];
    if (nonEditableStatuses.includes(swap.statusId)) {
      throw new Error(`A swap with status "${swap.status.statusName}" cannot be edited.`);
    }

    // 3. Verify supervisor relationship
    const isSupervisor = await verifySupervisorRelationship(supervisorTeamMemberId, swap.teamMemberId);
    if (!isSupervisor) {
      throw new Error('Access denied: you are not a supervisor of this team member.');
    }

    // 4. Load new holiday
    const holiday = await prisma.holiday.findUnique({
      where: { holidayId: input.holidayId },
      select: { holidayId: true, countryId: true, holidayDate: true, holidayName: true },
    });
    if (!holiday) throw new Error('Holiday not found.');

    // 5. Load TM for validations
    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: swap.teamMemberId },
      select: { teamMemberId: true, countryId: true },
    });
    if (!teamMember?.countryId) throw new Error('Team member country not found.');

    // 6. Validate eligibility for the new holiday (skip if same holiday)
    if (input.holidayId !== swap.holidayId) {
      const eligibility = await validateSwapEligibility({
        teamMemberId: swap.teamMemberId,
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
    }

    // 7. Validate replacement day
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

    // 8. Snapshot before
    const before = { ...swap };

    // 9. Update — reset to Tentative if was Acknowledged so it needs re-approval
    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        holidayId: holiday.holidayId,
        originalDate: holiday.holidayDate,
        replacementDate,
        statusId: statusIds.pending,
        active: true,
        updatedBy,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    // 10. Audit log
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: updatedBy,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap updated by supervisor ${updatedBy}`,
    });

    return toDTO(updated, holiday.holidayName, updated.status.statusName);
  }

  /** Supervisor cancels a TM's swap (PATCH /api/holiday-swaps/team/:id/cancel) */
  async cancelSwapForMember(
    swapId: number,
    supervisorTeamMemberId: number,
    updatedBy: string,
    input: CancelHolidaySwapDTO
  ): Promise<HolidaySwapDTO> {
    const statusIds = await loadStatusIds();

    // 1. Load swap
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: { holiday: true, status: true },
    });
    if (!swap) throw new Error('Holiday swap not found.');

    // 2. Block if already terminal
    const nonCancellableStatuses = [statusIds.taken, statusIds.cancelled, statusIds.rejected];
    if (nonCancellableStatuses.includes(swap.statusId)) {
      throw new Error(`A swap with status "${swap.status.statusName}" cannot be cancelled.`);
    }

    // 3. Verify supervisor relationship
    const isSupervisor = await verifySupervisorRelationship(supervisorTeamMemberId, swap.teamMemberId);
    if (!isSupervisor) {
      throw new Error('Access denied: you are not a supervisor of this team member.');
    }

    // 4. Validate cancellation (date and conflict checks)
    const cancellationCheck = await validateCancellation(swap);
    if (!cancellationCheck.valid) {
      throw new Error(cancellationCheck.errorMessage ?? 'Cancellation validation failed.');
    }

    // 5. Snapshot before
    const before = { ...swap };

    // 6. Update
    const updated = await prisma.holidaySwap.update({
      where: { holidaySwapId: swapId },
      data: {
        statusId: statusIds.cancelled,
        active: false,
        updatedBy,
        updatedAt: new Date(),
      },
      include: { status: true },
    });

    // 7. Audit log
    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(swapId),
      createdBy: updatedBy,
      oldValues: before as Record<string, unknown>,
      newValues: updated as Record<string, unknown>,
      comment: `Holiday swap cancelled by supervisor ${updatedBy}${input.comment ? ': ' + input.comment : ''}`,
    });

    // 8. Notify TM (best-effort)
    notifySwapCancelled({
      teamMemberId: swap.teamMemberId,
      swapId,
      employeeName: updatedBy,
      holidayName: swap.holiday.holidayName,
    }).catch(() => {});

    return toDTO(updated, swap.holiday.holidayName, updated.status.statusName);
  }

  /** Get a single swap detail with role-aware actions (GET /api/holiday-swaps/:id) */
  async getSwapDetail(
    swapId: number,
    requestingTeamMemberId: number
  ): Promise<HolidaySwapDetailDTO> {
    // 1. Load swap with related records
    const swap = await prisma.holidaySwap.findUnique({
      where: { holidaySwapId: swapId },
      include: {
        teamMember: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
        holiday: { select: { holidayName: true } },
        status: { select: { statusName: true } },
      },
    });

    if (!swap) {
      const err = new Error('Holiday swap not found.');
      (err as unknown as Record<string, unknown>).statusCode = 404;
      throw err;
    }

    // 2. Determine role
    let role: 'employee' | 'supervisor';
    if (swap.teamMemberId === requestingTeamMemberId) {
      role = 'employee';
    } else {
      const reports = await getReports(requestingTeamMemberId, true);
      const isUnderSupervisor = reports.some((r) => r.teamMemberId === swap.teamMemberId);
      if (!isUnderSupervisor) {
        const err = new Error('Access denied.');
        (err as unknown as Record<string, unknown>).statusCode = 403;
        throw err;
      }
      role = 'supervisor';
    }

    // 3. Compute available actions
    const statusIds = await loadStatusIds();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const originalDate = new Date(swap.originalDate);
    originalDate.setHours(0, 0, 0, 0);
    const originalDateInFuture = originalDate > today;

    let availableActions: Array<'cancel' | 'approve' | 'reject'> = [];
    if (role === 'employee') {
      const isCancellable =
        (swap.statusId === statusIds.pending || swap.statusId === statusIds.approved) &&
        originalDateInFuture;
      if (isCancellable) availableActions = ['cancel'];
    } else {
      if (swap.statusId === statusIds.pending) {
        availableActions = ['approve', 'reject'];
      }
    }

    return {
      holidaySwapId: swap.holidaySwapId,
      teamMemberId: swap.teamMemberId,
      teamMemberName: `${swap.teamMember.teamMemberNames} ${swap.teamMember.teamMemberSurnames}`,
      holidayId: swap.holidayId,
      holidayName: swap.holiday.holidayName,
      originalDate: swap.originalDate.toISOString(),
      replacementDate: swap.replacementDate.toISOString(),
      statusId: swap.statusId,
      statusName: swap.status.statusName,
      active: swap.active,
      createdBy: swap.createdBy,
      createdAt: swap.createdAt ? swap.createdAt.toISOString() : null,
      updatedAt: swap.updatedAt ? swap.updatedAt.toISOString() : null,
      role,
      availableActions,
    };
  }
}

export const holidaySwapOrchestrator = new HolidaySwapOrchestrator();
