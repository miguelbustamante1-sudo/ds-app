import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';

export async function acknowledgeTimeOff(
  timeOffId: number,
  recipientId: number,
  userId: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Step 1: Mark notification recipient as read
    await tx.recipient.updateMany({
      where: { id: recipientId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    // Step 2: Update time-off status to Acknowledge (sta_id = 2)
    await tx.timeOff.update({
      where: { timeOffId },
      data: { statusId: 2 },
    });

    // Step 3: Create changelog entry
    await tx.timeOffChangeLog.create({
      data: {
        timeOffId,
        changeLogComment: 'Time-off acknowledged by employee',
        changeLogOldValues: { statusId: 1 } as unknown as Prisma.InputJsonValue,
        changeLogNewValues: { statusId: 2 } as unknown as Prisma.InputJsonValue,
        changeLogCreatedBy: userId,
        changeLogCreatedDate: new Date(),
      },
    });
  });
}
