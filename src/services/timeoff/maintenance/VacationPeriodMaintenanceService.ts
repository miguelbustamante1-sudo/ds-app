import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';
import type { TimeOffPeriodMaintenanceDTO, UpdateTimeOffPeriodMaintenanceDTO } from '../../../../shared/dto/TimeOffPeriodMaintenance';

export class TimeOffPeriodMaintenanceNotFoundError extends AppError {
  constructor() {
    super('Time-off record not found', 404);
    this.name = 'TimeOffPeriodMaintenanceNotFoundError';
  }
}

const INCLUDE_RELATIONS = {
  teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
  status: { select: { statusName: true } },
} as const;

function mapToDTO(r: {
  timeOffId: number;
  teamMemberId: number | null;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  timeOffDays: { toString(): string };
  timeOffPeriod: string | null;
  timeOffBackfilled: number;
  teamMember: { teamMemberNames: string; teamMemberSurnames: string; workdayId: string | null } | null;
  status: { statusName: string } | null;
}): TimeOffPeriodMaintenanceDTO {
  return {
    timeOffId: r.timeOffId,
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMember?.teamMemberNames ?? null,
    teamMemberSurnames: r.teamMember?.teamMemberSurnames ?? null,
    workdayId: r.teamMember?.workdayId ?? null,
    timeOffStartDate: r.timeOffStartDate.toISOString(),
    timeOffEndDate: r.timeOffEndDate.toISOString(),
    timeOffDays: Number(r.timeOffDays),
    statusName: r.status?.statusName ?? null,
    timeOffPeriod: r.timeOffPeriod,
    timeOffBackfilled: r.timeOffBackfilled,
  };
}

export async function getAllVacationPeriodRecords(): Promise<TimeOffPeriodMaintenanceDTO[]> {
  const records = await prisma.timeOff.findMany({
    where: {
      category: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
      timeOffActive: 1,
    },
    include: INCLUDE_RELATIONS,
    orderBy: [{ teamMemberId: 'asc' }, { timeOffStartDate: 'desc' }],
  });

  return records.map(mapToDTO);
}

export async function updateVacationPeriodRecord(
  timeOffId: number,
  data: UpdateTimeOffPeriodMaintenanceDTO,
  userEmail: string
): Promise<TimeOffPeriodMaintenanceDTO> {
  const existing = await prisma.timeOff.findUnique({
    where: { timeOffId },
    select: { timeOffId: true, timeOffPeriod: true, timeOffBackfilled: true },
  });

  if (!existing) throw new TimeOffPeriodMaintenanceNotFoundError();

  const updated = await prisma.timeOff.update({
    where: { timeOffId },
    data: {
      timeOffPeriod: data.timeOffPeriod,
      timeOffBackfilled: data.timeOffBackfilled,
    },
    include: INCLUDE_RELATIONS,
  });

  await auditOrchestrator.log({
    entityName: 'tbl_tms_time_off',
    entityId: String(timeOffId),
    createdBy: userEmail,
    oldValues: { timeOffPeriod: existing.timeOffPeriod, timeOffBackfilled: existing.timeOffBackfilled },
    newValues: { timeOffPeriod: data.timeOffPeriod, timeOffBackfilled: data.timeOffBackfilled },
    comment: 'Vacation period/backfilled flag updated via maintenance page',
  });

  return mapToDTO(updated);
}
