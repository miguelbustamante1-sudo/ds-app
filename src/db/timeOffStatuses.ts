import { prisma } from './prisma';
import type { TimeOffStatus } from '@prisma/client';

/**
 * Get all time off statuses
 */
export async function getAllStatuses(): Promise<TimeOffStatus[]> {
  return await prisma.timeOffStatus.findMany({
    orderBy: { statusId: 'asc' },
  });
}

/**
 * Get a status by id
 */
export async function getStatusById(id: number): Promise<TimeOffStatus | null> {
  return await prisma.timeOffStatus.findUnique({
    where: { statusId: id },
  });
}

/**
 * Get a status by name (case-insensitive)
 */
export async function getStatusByName(statusName: string): Promise<TimeOffStatus | null> {
  const statuses = await prisma.timeOffStatus.findMany({
    where: {
      statusName: {
        equals: statusName,
        mode: 'insensitive',
      },
    },
  });
  return statuses[0] ?? null;
}

/**
 * Create a new status
 */
export async function createStatus(statusName: string): Promise<TimeOffStatus> {
  return await prisma.timeOffStatus.create({
    data: { statusName },
  });
}

/**
 * Update a status
 */
export async function updateStatus(id: number, statusName: string): Promise<TimeOffStatus | null> {
  return await prisma.timeOffStatus.update({
    where: { statusId: id },
    data: { statusName },
  });
}

/**
 * Delete a status
 */
export async function deleteStatus(id: number): Promise<void> {
  await prisma.timeOffStatus.delete({
    where: { statusId: id },
  });
}
