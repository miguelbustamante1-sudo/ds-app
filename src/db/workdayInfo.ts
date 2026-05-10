import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import type { WorkdayInfo } from '@prisma/client';
import type { CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO, WorkdayInfoExceptionItemDTO, WorkdayInfoExceptionsDTO } from '../../shared/dto/WorkdayInfo';
import { computeAnniversaryWindow } from '../services/timeoff/utils/anniversaryYear';

const REJECTED_STATUS_ID = 5;
const SPLIT_STATUS_ID = 6;
const MAX_EXCEPTION_DAYS = 5;

export interface WorkdayInfoRecord extends WorkdayInfo {
  exceptionDaysUsed: number | null;
  exceptionDaysRemaining: number | null;
}

export async function getAllWorkdayInfo(): Promise<WorkdayInfoRecord[]> {
  const records = await prisma.workdayInfo.findMany({
    orderBy: { wdid: 'asc' },
  });

  if (records.length === 0) return [];

  const wdids = records.map((r) => r.wdid);

  const gtMembers = await prisma.teamMember.findMany({
    where: {
      workdayId: { in: wdids },
      country: { countryIso: { equals: 'GT', mode: 'insensitive' } },
    },
    select: { teamMemberId: true, workdayId: true, teamMemberStartDate: true },
  });

  const exceptionByWdid = new Map<string, number>();

  if (gtMembers.length > 0) {
    const cancelledStatus = await prisma.timeOffStatus.findFirst({
      where: { statusName: { equals: 'cancelled', mode: 'insensitive' } },
      select: { statusId: true },
    });
    const excludedIds = [
      REJECTED_STATUS_ID,
      SPLIT_STATUS_ID,
      ...(cancelledStatus?.statusId ? [cancelledStatus.statusId] : []),
    ];

    const vacationCategory = await prisma.timeOffCategory.findFirst({
      where: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
      select: { categoryId: true },
    });

    if (vacationCategory) {
      const hireDateByWdid = new Map(
        (await prisma.workdayInfo.findMany({
          where: { wdid: { in: gtMembers.map((m) => m.workdayId!).filter(Boolean) } },
          select: { wdid: true, hireDate: true },
        })).map((wi) => [wi.wdid, wi.hireDate])
      );

      for (const member of gtMembers) {
        if (!member.workdayId) continue;
        const hireDate = hireDateByWdid.get(member.workdayId) ?? null;
        const { anniversaryYearStart, anniversaryYearEnd } = computeAnniversaryWindow(
          hireDate ?? member.teamMemberStartDate
        );
        const exceptionTimeOffs = await prisma.timeOff.findMany({
          where: {
            teamMemberId: member.teamMemberId,
            categoryId: vacationCategory.categoryId,
            timeOffActive: 1,
            timeOffIsException: true,
            statusId: { notIn: excludedIds },
            timeOffStartDate: { gte: anniversaryYearStart, lte: anniversaryYearEnd },
          },
          select: { timeOffDays: true },
        });
        const used = exceptionTimeOffs.reduce((sum, t) => sum + Number(t.timeOffDays), 0);
        exceptionByWdid.set(member.workdayId, used);
      }
    }
  }

  return records.map((r) => {
    const exceptionDaysUsed = exceptionByWdid.has(r.wdid) ? exceptionByWdid.get(r.wdid)! : null;
    return {
      ...r,
      exceptionDaysUsed,
      exceptionDaysRemaining:
        exceptionDaysUsed !== null ? Math.max(0, MAX_EXCEPTION_DAYS - exceptionDaysUsed) : null,
    };
  });
}

export async function getWorkdayInfoById(wdid: string): Promise<WorkdayInfo | null> {
  return await prisma.workdayInfo.findUnique({
    where: { wdid },
  });
}

export async function createWorkdayInfo(data: CreateWorkdayInfoDTO): Promise<WorkdayInfo> {
  return await prisma.workdayInfo.create({
    data: {
      wdid: data.wdid,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      corporateEmail: data.corporateEmail ?? null,
      personalEmail: data.personalEmail ?? null,
      allEmails: data.allEmails === null ? Prisma.JsonNull : (data.allEmails ?? []),
      cellphone: data.cellphone ?? null,
      homePhone: data.homePhone ?? null,
      birthDate: data.birthDate ?? null,
      parenthood: data.parenthood ?? null,
      workStyle: data.workStyle ?? null,
      gender: data.gender ?? null,
      billingStatus: data.billingStatus ?? null,
      costCenterHierarchy: data.costCenterHierarchy ?? null,
      costCenterNames: data.costCenterNames ?? null,
      directManager: data.directManager ?? null,
      vacation: data.vacation ?? null,
      personalDays: data.personalDays ?? null,
    },
  });
}

export async function updateWorkdayInfo(wdid: string, data: UpdateWorkdayInfoDTO): Promise<WorkdayInfo> {
  return await prisma.workdayInfo.update({
    where: { wdid },
    data: {
      ...(data.hireDate !== undefined ? { hireDate: data.hireDate ? new Date(data.hireDate) : null } : {}),
      ...(data.corporateEmail !== undefined ? { corporateEmail: data.corporateEmail } : {}),
      ...(data.personalEmail !== undefined ? { personalEmail: data.personalEmail } : {}),
      ...(data.allEmails !== undefined ? { allEmails: data.allEmails === null ? Prisma.JsonNull : data.allEmails } : {}),
      ...(data.cellphone !== undefined ? { cellphone: data.cellphone } : {}),
      ...(data.homePhone !== undefined ? { homePhone: data.homePhone } : {}),
      ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
      ...(data.parenthood !== undefined ? { parenthood: data.parenthood } : {}),
      ...(data.workStyle !== undefined ? { workStyle: data.workStyle } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      ...(data.billingStatus !== undefined ? { billingStatus: data.billingStatus } : {}),
      ...(data.costCenterHierarchy !== undefined ? { costCenterHierarchy: data.costCenterHierarchy } : {}),
      ...(data.costCenterNames !== undefined ? { costCenterNames: data.costCenterNames } : {}),
      ...(data.directManager !== undefined ? { directManager: data.directManager } : {}),
      ...(data.vacation !== undefined ? { vacation: data.vacation } : {}),
      ...(data.personalDays !== undefined ? { personalDays: data.personalDays } : {}),
    },
  });
}

export async function getWorkdayInfoExceptions(wdid: string): Promise<WorkdayInfoExceptionsDTO> {
  const [member, workdayInfoForDate] = await Promise.all([
    prisma.teamMember.findFirst({
      where: {
        workdayId: wdid,
        country: { countryIso: { equals: 'GT', mode: 'insensitive' } },
      },
      select: { teamMemberId: true, teamMemberStartDate: true },
    }),
    prisma.workdayInfo.findUnique({
      where: { wdid },
      select: { hireDate: true },
    }),
  ]);

  if (!member) {
    return { anniversaryYearStart: null, anniversaryYearEnd: null, exceptionDaysUsed: null, exceptionDaysRemaining: null, exceptions: [] };
  }

  const { anniversaryYearStart, anniversaryYearEnd } = computeAnniversaryWindow(
    workdayInfoForDate?.hireDate ?? member.teamMemberStartDate
  );

  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: 'cancelled', mode: 'insensitive' } },
    select: { statusId: true },
  });
  const excludedIds = [
    REJECTED_STATUS_ID,
    SPLIT_STATUS_ID,
    ...(cancelledStatus?.statusId ? [cancelledStatus.statusId] : []),
  ];

  const vacationCategory = await prisma.timeOffCategory.findFirst({
    where: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
    select: { categoryId: true },
  });

  if (!vacationCategory) {
    return {
      anniversaryYearStart: anniversaryYearStart.toISOString(),
      anniversaryYearEnd: anniversaryYearEnd.toISOString(),
      exceptionDaysUsed: 0,
      exceptionDaysRemaining: MAX_EXCEPTION_DAYS,
      exceptions: [],
    };
  }

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId: member.teamMemberId,
      categoryId: vacationCategory.categoryId,
      timeOffActive: 1,
      timeOffIsException: true,
      statusId: { notIn: excludedIds },
      timeOffStartDate: { gte: anniversaryYearStart, lte: anniversaryYearEnd },
    },
    select: {
      timeOffId: true,
      timeOffStartDate: true,
      timeOffEndDate: true,
      timeOffDays: true,
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  const exceptions: WorkdayInfoExceptionItemDTO[] = timeOffs.map((t) => ({
    timeOffId: t.timeOffId,
    timeOffStartDate: t.timeOffStartDate.toISOString(),
    timeOffEndDate: t.timeOffEndDate.toISOString(),
    timeOffDays: Number(t.timeOffDays),
    categoryName: t.category?.categoryName ?? '—',
    statusName: t.status?.statusName ?? '—',
  }));

  const exceptionDaysUsed = exceptions.reduce((sum, e) => sum + e.timeOffDays, 0);

  return {
    anniversaryYearStart: anniversaryYearStart.toISOString(),
    anniversaryYearEnd: anniversaryYearEnd.toISOString(),
    exceptionDaysUsed,
    exceptionDaysRemaining: Math.max(0, MAX_EXCEPTION_DAYS - exceptionDaysUsed),
    exceptions,
  };
}

export async function deleteWorkdayInfo(wdid: string): Promise<void> {
  await prisma.workdayInfo.delete({
    where: { wdid },
  });
}
