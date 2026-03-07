import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import type { WorkdayInfo } from '@prisma/client';
import type { CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO } from '../../shared/dto/WorkdayInfo';

export async function getAllWorkdayInfo(): Promise<WorkdayInfo[]> {
  return await prisma.workdayInfo.findMany({
    orderBy: { wdid: 'asc' },
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

export async function deleteWorkdayInfo(wdid: string): Promise<void> {
  await prisma.workdayInfo.delete({
    where: { wdid },
  });
}
