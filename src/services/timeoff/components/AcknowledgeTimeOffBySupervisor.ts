import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';

export async function acknowledgeTimeOffBySupervisor(params: {
  timeOffId: number;
  oldStatusId: number;
  newStatusId: number;
  comment: string;
  userId: number;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.timeOff.update({
      where: { timeOffId: params.timeOffId },
      data: { statusId: params.newStatusId },
    });

    await tx.timeOffChangeLog.create({
      data: {
        timeOffId: params.timeOffId,
        changeLogComment: params.comment,
        changeLogOldValues: { statusId: params.oldStatusId } as unknown as Prisma.InputJsonValue,
        changeLogNewValues: { statusId: params.newStatusId } as unknown as Prisma.InputJsonValue,
        changeLogCreatedBy: params.userId,
        changeLogCreatedDate: new Date(),
      },
    });
  });
}
