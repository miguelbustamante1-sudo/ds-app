import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export type WorkdayMomentType = 'PLAN_ACTIVATED' | 'MID_PLAN_CHANGE' | 'PLAN_CLOSED';

// es.wko_workday_boost_sync is exempt from audit logging (governance 3.4, es-schema carve-out) —
// this is a pure insert into a transient outbox table, no auditOrchestrator.log call here.
export async function writeWorkdayOutboxEntry(
  caseId: number,
  teamMemberWdid: string,
  momentType: WorkdayMomentType,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.workdayBoostSync.create({
    data: {
      caseId,
      teamMemberWdid,
      momentType,
      payload: payload as unknown as Prisma.InputJsonValue,
      syncStatus: 'PENDING',
    },
  });
}
