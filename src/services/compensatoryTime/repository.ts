/**
 * Compensatory Time - Repository (Data Access Layer)
 *
 * Responsibility: raw data access for compensatory time records.
 * Maps to the `ct_compensatory_time` table via Prisma.
 */

import { prisma } from '../../db/prisma';
import type { CompensatoryTimeDTO } from '../../../shared/dto/CompensatoryTime';

// --- Shared select shape ------------------------------------------------------

const compensatoryTimeSelect = {
  compensatoryTimeId: true,
  startingTime:       true,
  endingTime:         true,
  subject:            true,
  status:             true,
  compType:           true,
  deleted:            true,
  teamMemberId:       true,
  projectId:          true,
  dayHours:           true,
  nightHours:         true,
  totalCreditedHours: true,
  createdBy:          true,
  createdDate:        true,
  rejectionReason:    true,
  teamMember: {
    select: {
      teamMemberNames:    true,
      teamMemberSurnames: true,
      workdayId:          true,
      country: { select: { nightMultiplier: true } },
    },
  },
  project: { select: { projectName: true } },
} as const;

type CompensatoryTimeRow = Awaited<ReturnType<typeof prisma.compensatoryTime.findMany<{ select: typeof compensatoryTimeSelect }>>>[number];

function toDTO(row: CompensatoryTimeRow): import('../../../shared/dto/CompensatoryTime').CompensatoryTimeDTO {
  const { teamMember, project, dayHours, nightHours, totalCreditedHours, ...rest } = row;
  const name = teamMember
    ? `${teamMember.teamMemberNames ?? ''} ${teamMember.teamMemberSurnames ?? ''}`.trim() +
      (teamMember.workdayId ? ` (${teamMember.workdayId})` : '')
    : undefined;
  const nightMult = teamMember?.country?.nightMultiplier != null
    ? Number(teamMember.country.nightMultiplier)
    : 1;
  const nightMultipliedHours = Math.round(Number(nightHours) * nightMult * 100) / 100;
  return {
    ...rest,
    dayHours:             Number(dayHours),
    nightHours:           Number(nightHours),
    nightMultipliedHours,
    totalCreditedHours:   Number(totalCreditedHours),
    ...(name                       !== undefined ? { teamMemberName: name }             : {}),
    ...(project?.projectName != null             ? { projectName: project.projectName } : {}),
  };
}

// --- Pagination ---------------------------------------------------------------

/** Columns that can be used for server-side sorting */
export type SortableColumn =
  | 'createdDate'
  | 'startingTime'
  | 'endingTime'
  | 'subject'
  | 'status'
  | 'totalCreditedHours'
  | 'dayHours'
  | 'nightHours';

export interface PaginationOptions {
  /** 1-based page number (default: 1) */
  page: number;
  /** Items per page (default: 10, max: 100) */
  limit: number;
  /** Optional filter: only return records for this team member */
  teamMemberId?: number;
  /** Optional filter: return records for any of these team member IDs (IN clause) */
  teamMemberIds?: number[];
  /** Optional filter: only return records with this status (single value) */
  status?: string;
  /** Optional filter: only return records whose status is one of these values */
  statuses?: string[];
  /** Optional filter: only return records with this compType */
  compType?: string;
  /** Optional text search on the team member name or surname */
  teamMemberSearch?: string;
  /** Optional text search on the project name */
  projectSearch?: string;
  /** Optional text search on the subject/description */
  subjectSearch?: string;
  /** Optional text search on the rejection reason */
  rejectionReasonSearch?: string;
  /** Column to sort by (default: createdDate) */
  sortBy?: SortableColumn;
  /** Sort direction (default: desc) */
  sortDir?: 'asc' | 'desc';
}

// --- Query functions ----------------------------------------------------------

/**
 * Returns a paginated slice of compensatory time records ordered by
 * createdDate descending.
 */
export async function getAllCompensatoryTimes(
  pagination: PaginationOptions,
): Promise<CompensatoryTimeDTO[]> {
  const { page, limit, teamMemberId } = pagination;
  const skip = (page - 1) * limit;

  const { teamMemberIds } = pagination;
  const rows = await prisma.compensatoryTime.findMany({
    where: {
      deleted: false,
      ...(teamMemberIds !== undefined && teamMemberIds.length > 0
        ? { teamMemberId: { in: teamMemberIds } }
        : teamMemberId !== undefined
          ? { teamMemberId }
          : {}),
      ...(pagination.statuses !== undefined && pagination.statuses.length > 0
        ? { status: { in: pagination.statuses } }
        : pagination.status !== undefined
          ? { status: pagination.status }
          : {}),
      ...(pagination.compType !== undefined ? { compType: pagination.compType } : {}),
      ...(pagination.subjectSearch
        ? { subject: { contains: pagination.subjectSearch, mode: 'insensitive' as const } }
        : {}),
      ...(pagination.rejectionReasonSearch
        ? { rejectionReason: { contains: pagination.rejectionReasonSearch, mode: 'insensitive' as const } }
        : {}),
      ...(pagination.teamMemberSearch
        ? {
            teamMember: {
              OR: [
                { teamMemberNames:    { contains: pagination.teamMemberSearch, mode: 'insensitive' as const } },
                { teamMemberSurnames: { contains: pagination.teamMemberSearch, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
      ...(pagination.projectSearch
        ? { project: { projectName: { contains: pagination.projectSearch, mode: 'insensitive' as const } } }
        : {}),
    },
    select: compensatoryTimeSelect,
    orderBy: pagination.sortBy && pagination.sortBy !== 'createdDate'
      ? [{ [pagination.sortBy]: pagination.sortDir ?? 'asc' }, { createdDate: 'desc' }, { compensatoryTimeId: 'desc' }]
      : [{ createdDate: pagination.sortDir ?? 'desc' }, { compensatoryTimeId: 'desc' }],
    skip,
    take: limit,
  });

  return rows.map(toDTO);
}

/**
 * Returns the total count of non-deleted compensatory time records
 * matching the given filters (no pagination applied).
 */
export async function countCompensatoryTimes(
  options: Pick<PaginationOptions, 'teamMemberId' | 'teamMemberIds' | 'status' | 'statuses' | 'compType' | 'teamMemberSearch' | 'projectSearch' | 'subjectSearch' | 'rejectionReasonSearch'>,
): Promise<number> {
  return prisma.compensatoryTime.count({
    where: {
      deleted: false,
      ...(options.teamMemberIds !== undefined && options.teamMemberIds.length > 0
        ? { teamMemberId: { in: options.teamMemberIds } }
        : options.teamMemberId !== undefined
          ? { teamMemberId: options.teamMemberId }
          : {}),
      ...(options.statuses !== undefined && options.statuses.length > 0
        ? { status: { in: options.statuses } }
        : options.status !== undefined
          ? { status: options.status }
          : {}),
      ...(options.compType !== undefined ? { compType: options.compType } : {}),
      ...(options.subjectSearch
        ? { subject: { contains: options.subjectSearch, mode: 'insensitive' as const } }
        : {}),
      ...(options.rejectionReasonSearch
        ? { rejectionReason: { contains: options.rejectionReasonSearch, mode: 'insensitive' as const } }
        : {}),
      ...(options.teamMemberSearch
        ? {
            teamMember: {
              OR: [
                { teamMemberNames:    { contains: options.teamMemberSearch, mode: 'insensitive' as const } },
                { teamMemberSurnames: { contains: options.teamMemberSearch, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
      ...(options.projectSearch
        ? { project: { projectName: { contains: options.projectSearch, mode: 'insensitive' as const } } }
        : {}),
    },
  });
}

/**
 * Returns a single compensatory time record by id, or null if not found.
 */
export async function getCompensatoryTimeById(
  id: number,
): Promise<CompensatoryTimeDTO | null> {
  const row = await prisma.compensatoryTime.findUnique({
    where: { compensatoryTimeId: id },
    select: compensatoryTimeSelect,
  });
  return row ? toDTO(row) : null;
}

/**
 * Creates a new compensatory time record and returns the created record.
 */
export async function createCompensatoryTime(
  data: {
    startingTime: Date;
    endingTime: Date;
    subject: string;
    teamMemberId: number;
    projectId: number;
    dayHours: number;
    nightHours: number;
    totalCreditedHours?: number;
    createdBy: string;
    compType?: string;
  },
): Promise<CompensatoryTimeDTO> {
  const row = await prisma.compensatoryTime.create({
    data: {
      startingTime: data.startingTime,
      endingTime:   data.endingTime,
      subject:      data.subject,
      teamMemberId: data.teamMemberId,
      projectId:    data.projectId,
      dayHours:     data.dayHours,
      nightHours:   data.nightHours,
      ...(data.totalCreditedHours !== undefined ? { totalCreditedHours: data.totalCreditedHours } : {}),
      createdBy:    data.createdBy,
      ...(data.compType ? { compType: data.compType } : {}),
    },
    select: compensatoryTimeSelect,
  });
  return toDTO(row);
}

export interface UpdateCompensatoryTimeInput {
  startingTime?:    Date;
  endingTime?:      Date;
  subject?:         string;
  projectId?:       number;
  status?:          string;
  rejectionReason?: string;
  compType?:        string;
}

/**
 * Updates a compensatory time record by id. Only the provided fields are
 * changed. Returns the updated record, or null if the record does not exist.
 */
export async function updateCompensatoryTime(
  id: number,
  data: UpdateCompensatoryTimeInput,
): Promise<CompensatoryTimeDTO | null> {
  try {
    const row = await prisma.compensatoryTime.update({
      where: { compensatoryTimeId: id },
      data: {
        ...(data.startingTime    !== undefined ? { startingTime:    data.startingTime    } : {}),
        ...(data.endingTime      !== undefined ? { endingTime:      data.endingTime      } : {}),
        ...(data.subject         !== undefined ? { subject:         data.subject         } : {}),
        ...(data.projectId       !== undefined ? { projectId:       data.projectId       } : {}),
        ...(data.status          !== undefined ? { status:          data.status          } : {}),
        ...(data.rejectionReason !== undefined ? { rejectionReason: data.rejectionReason } : {}),
        ...(data.compType        !== undefined ? { compType:        data.compType        } : {}),
      },
      select: compensatoryTimeSelect,
    });
    return toDTO(row);
  } catch {
    return null;
  }
}

export interface CompensatoryTimeSummary {
  totalByStatus: Record<string, number>;
  totalHoursByStatus: Record<string, number>;
}

/**
 * Returns a count and total hours of non-deleted compensatory time records
 * grouped by status. If teamMemberId is provided, only records for that member
 * are included.
 *
 * totalHoursByStatus is calculated as:
 *   dayHours + nightHours * nightMultiplier (from the team member's country).
 * nightMultiplier defaults to 1 when absent.
 */
export async function getCompensatoryTimeSummary(
  teamMemberId?: number,
  compType?: string,
): Promise<CompensatoryTimeSummary> {
  const rows = await prisma.compensatoryTime.findMany({
    where: {
      deleted: false,
      ...(teamMemberId !== undefined ? { teamMemberId } : {}),
      ...(compType     !== undefined ? { compType }     : {}),
    },
    select: {
      status:      true,
      dayHours:    true,
      nightHours:  true,
      teamMemberId: true,
      teamMember: { select: { country: { select: { nightMultiplier: true } } } },
    },
  });

  const totalByStatus:      Record<string, number> = {};
  const totalHoursByStatus: Record<string, number> = {};

  for (const row of rows) {
    const key       = row.status ?? 'UNKNOWN';
    const mult      = row.teamMember?.country?.nightMultiplier != null
      ? Number(row.teamMember.country.nightMultiplier)
      : 1;
    const hours     = Number(row.dayHours) + Number(row.nightHours) * mult;
    totalByStatus[key]      = (totalByStatus[key]      ?? 0) + 1;
    totalHoursByStatus[key] = Math.round(((totalHoursByStatus[key] ?? 0) + hours) * 100) / 100;
  }

  return { totalByStatus, totalHoursByStatus };
}

/**
 * Returns the country night policy (nightStart, nightEnd as integer hours) for a team member.
 * Returns null if the team member has no country or the country has no night policy.
 */
export async function getNightPolicyForTeamMember(
  teamMemberId: number,
): Promise<{ nightStart: number; nightEnd: number } | null> {
  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: {
      country: {
        select: { nightStart: true, nightEnd: true },
      },
    },
  });

  const country = member?.country;
  if (!country || country.nightStart == null || country.nightEnd == null) return null;
  return { nightStart: country.nightStart, nightEnd: country.nightEnd };
}

/**
 * Returns the shift details (startTime, endTime as integer hours per day-of-week)
 * for the active project assignment of a given team member on a given project.
 * Returns null if no assignment or no shift is linked.
 */
export async function getShiftDetailsForAssignment(
  teamMemberId: number,
  projectId: number,
): Promise<{ dayOfWeek: number; startTime: number; endTime: number; workingHours: number }[] | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      teamMemberId,
      projectId,
      OR: [
        { projectAssignmentEndDate: null },
        { projectAssignmentEndDate: { gte: today } },
      ],
    },
    select: {
      shiftId: true,
      shift: {
        select: {
          details: {
            select: { dayOfWeek: true, startTime: true, endTime: true, workingHours: true },
          },
        },
      },
    },
    orderBy: { projectAssignmentId: 'desc' },
  });

  if (!assignment || !assignment.shift) return null;
  return assignment.shift.details.map((d) => ({
    ...d,
    workingHours: Number(d.workingHours),
  }));
}

/**
 * Calculates the compensatory time balance for a team member.
 *
 * Balance = SUM(EARNED dayHours + nightHours * nightMultiplier)
 *         - SUM(USED dayHours)
 *
 * Only non-deleted records are included.
 * nightMultiplier is read from the team member's country; defaults to 1 when absent.
 */
export async function getCompensatoryTimeBalance(
  teamMemberId: number,
): Promise<{ earnedHours: number; usedHours: number; pendingHours: number; balanceHours: number; nightMultiplier: number; nightStart: number | null; nightEnd: number | null }> {
  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { country: { select: { nightMultiplier: true, nightStart: true, nightEnd: true } } },
  });

  const nightMultiplier = member?.country?.nightMultiplier != null
    ? Number(member.country.nightMultiplier)
    : 1;
  const nightStart = member?.country?.nightStart != null ? member.country.nightStart : null;
  const nightEnd   = member?.country?.nightEnd   != null ? member.country.nightEnd   : null;

  const [earnedRows, usedRows, pendingRows] = await Promise.all([
    prisma.compensatoryTime.findMany({
      where: { teamMemberId, deleted: false, compType: 'EARNED', status: 'APPROVED' },
      select: { dayHours: true, nightHours: true },
    }),
    prisma.compensatoryTime.findMany({
      where: { teamMemberId, deleted: false, compType: 'USED', status: 'APPROVED' },
      select: { totalCreditedHours: true },
    }),
    prisma.compensatoryTime.findMany({
      where: { teamMemberId, deleted: false, compType: 'USED', status: 'SUBMITTED' },
      select: { totalCreditedHours: true },
    }),
  ]);

  const earnedHours  = earnedRows.reduce(
    (sum, r) => sum + Number(r.dayHours) + Number(r.nightHours) * nightMultiplier,
    0,
  );
  const usedHours    = usedRows.reduce((sum, r) => sum + Number(r.totalCreditedHours), 0);
  const pendingHours = pendingRows.reduce((sum, r) => sum + Number(r.totalCreditedHours), 0);

  const roundedEarned  = Math.round(earnedHours  * 100) / 100;
  const roundedUsed    = Math.round(usedHours    * 100) / 100;
  const roundedPending = Math.round(pendingHours * 100) / 100;

  return {
    earnedHours:  roundedEarned,
    usedHours:    roundedUsed,
    pendingHours: roundedPending,
    balanceHours: Math.round((roundedEarned - roundedUsed) * 100) / 100,
    nightMultiplier,
    nightStart,
    nightEnd,
  };
}

/**
 * Builds a Map of teamMemberId -> reportLevel (depth) for the full recursive
 * reporting hierarchy under the given supervisor (unlimited depth).
 * Does NOT include the supervisor itself.
 * Only active assignments (txs_stadat <= today <= txs_enddat) are included.
 */
export async function getReportLevelMapForSupervisor(
  supervisorId: number,
): Promise<Map<number, number>> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const rows = await prisma.$queryRaw<Array<{ team_member_id: bigint; depth: bigint }>>`
    WITH RECURSIVE team_hierarchy AS (
      SELECT
        sa.tms_id::int     AS team_member_id,
        1::int             AS depth
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.sup_id = ${supervisorId}::int
        AND sa.txs_stadat <= ${todayStr}::date
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${todayStr}::date)

      UNION ALL

      SELECT
        sa.tms_id::int          AS team_member_id,
        (th.depth + 1)::int     AS depth
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN team_hierarchy th ON sa.sup_id = th.team_member_id
      WHERE sa.txs_stadat <= ${todayStr}::date
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${todayStr}::date)
    ),
    ranked AS (
      SELECT DISTINCT ON (team_member_id)
        team_member_id,
        depth
      FROM team_hierarchy
      ORDER BY team_member_id, depth ASC
    )
    SELECT team_member_id, depth FROM ranked
  `;

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(Number(row.team_member_id), Number(row.depth));
  }
  return map;
}

/**
 * Returns ALL team member IDs in the full recursive reporting hierarchy
 * under the given supervisor (unlimited depth). Does NOT include the supervisor.
 * Only active assignments are included.
 */
export async function getAllSubordinateIds(
  supervisorId: number,
): Promise<number[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<Array<{ team_member_id: bigint }>>`
    WITH RECURSIVE team_hierarchy AS (
      SELECT sa.tms_id::int AS team_member_id
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.sup_id = ${supervisorId}::int
        AND sa.txs_stadat <= ${todayStr}::date
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${todayStr}::date)

      UNION ALL

      SELECT sa.tms_id::int AS team_member_id
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN team_hierarchy th ON sa.sup_id = th.team_member_id
      WHERE sa.txs_stadat <= ${todayStr}::date
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${todayStr}::date)
    )
    SELECT DISTINCT team_member_id FROM team_hierarchy
  `;
  return rows.map((r) => Number(r.team_member_id));
}

/**
 * Returns the team member IDs directly supervised by the given supervisor ID.
 * Only active assignments (no end date or end date >= today) are included.
 */
export async function getTeamMemberIdsBySupervisor(
  supervisorId: number,
): Promise<number[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      supervisorId,
      OR: [
        { supervisorAssignmentEndDate: null },
        { supervisorAssignmentEndDate: { gte: today } },
      ],
    },
    select: { teamMemberId: true },
  });

  return assignments
    .map((a) => a.teamMemberId)
    .filter((id): id is number => id !== null);
}

/**
 * Soft-deletes a compensatory time record by setting deleted = true.
 * Returns the updated record, or null if no record with that id exists.
 */
export async function softDeleteCompensatoryTime(
  id: number,
): Promise<CompensatoryTimeDTO | null> {
  try {
    const row = await prisma.compensatoryTime.update({
      where: { compensatoryTimeId: id },
      data:  { deleted: true },
      select: compensatoryTimeSelect,
    });
    return toDTO(row);
  } catch {
    return null;
  }
}
