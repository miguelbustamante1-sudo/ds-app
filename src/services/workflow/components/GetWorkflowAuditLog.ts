import { WalWorkflowAuditLog } from '@prisma/client';
import { prisma } from '../../../db/prisma';

interface GetAuditLogParams {
  winId: string;
  witId: string | undefined;
}

export async function getWorkflowAuditLog(params: GetAuditLogParams): Promise<WalWorkflowAuditLog[]> {
  const { winId, witId } = params;

  return prisma.walWorkflowAuditLog.findMany({
    where: {
      winId,
      ...(witId ? { witId } : {}),
    },
    orderBy: { eventTimestamp: 'asc' },
  });
}
