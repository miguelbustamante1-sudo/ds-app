import { prisma } from '../../../db/prisma';

const STALE_THRESHOLD_HOURS = 48;

export async function getStaleOutboxEntries(): Promise<
  { syncId: number; caseId: number; momentType: string; syncStatus: string; createdDate: string }[]
> {
  const threshold = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000);
  const rows = await prisma.workdayBoostSync.findMany({
    where: {
      OR: [{ syncStatus: 'FAILED' }, { syncStatus: 'PENDING', createdDate: { lt: threshold } }],
    },
    orderBy: { createdDate: 'asc' },
  });
  return rows.map((row) => ({
    syncId: row.syncId,
    caseId: row.caseId,
    momentType: row.momentType,
    syncStatus: row.syncStatus,
    createdDate: row.createdDate.toISOString(),
  }));
}
