/**
 * TimeOff Changelog Service
 * Handles audit trail for time-off modifications
 */

import { prisma } from '../../../db/prisma';
import type { TimeOffChangeLog } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Input for creating a changelog entry
 */
export interface CreateChangeLogInput {
  timeOffId: number;
  comment: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdByUserId: number | null;
}

/**
 * DTO for changelog entries returned to client
 */
export interface TimeOffChangeLogDTO {
  changeLogId: number;
  timeOffId: number | null;
  changeLogComment: string;
  changeLogOldValues: Record<string, unknown> | null;
  changeLogNewValues: Record<string, unknown> | null;
  changeLogCreatedBy: number | null;
  changeLogCreatedDate: Date | null;
  createdByUserName?: string | null;
}

/**
 * Create a changelog entry for a time-off modification
 */
export async function createTimeOffChangeLog(
  input: CreateChangeLogInput
): Promise<TimeOffChangeLog> {
  return await prisma.timeOffChangeLog.create({
    data: {
      timeOffId: input.timeOffId,
      changeLogComment: input.comment,
      changeLogOldValues: input.oldValues
        ? (input.oldValues as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      changeLogNewValues: input.newValues
        ? (input.newValues as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      changeLogCreatedBy: input.createdByUserId,
      changeLogCreatedDate: new Date(),
    },
  });
}

/**
 * Get all changelog entries for a time-off request
 */
export async function getTimeOffChangeLog(
  timeOffId: number
): Promise<TimeOffChangeLogDTO[]> {
  const logs = await prisma.timeOffChangeLog.findMany({
    where: { timeOffId },
    include: {
      createdByUser: {
        select: { userName: true },
      },
    },
    orderBy: { changeLogCreatedDate: 'desc' },
  });

  return logs.map((log) => ({
    changeLogId: log.changeLogId,
    timeOffId: log.timeOffId,
    changeLogComment: log.changeLogComment,
    changeLogOldValues: log.changeLogOldValues as Record<string, unknown> | null,
    changeLogNewValues: log.changeLogNewValues as Record<string, unknown> | null,
    changeLogCreatedBy: log.changeLogCreatedBy,
    changeLogCreatedDate: log.changeLogCreatedDate,
    createdByUserName: log.createdByUser?.userName ?? null,
  }));
}
