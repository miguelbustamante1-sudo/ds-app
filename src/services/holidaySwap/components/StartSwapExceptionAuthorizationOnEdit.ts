import type { HolidaySwap } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { instantiateSwapExceptionAuthorizationWorkflow } from './InstantiateSwapExceptionAuthorizationWorkflow';
import { loadStatusIds } from './LoadStatusIds';

const ENTITY_NAME = 'hsw_holiday_swap';

export interface StartSwapExceptionAuthorizationOnEditInput {
  holidaySwapId: number;
  /** Full pre-change row snapshot, for the audit log's oldValues. */
  before: Record<string, unknown>;
  holidayId: number;
  originalDate: Date;
  replacementDate: Date;
  updatedBy: string;
  /** The acting user's own usr_id — becomes the workflow's ownerUserId. */
  requestedByUserId: number;
  reasonComment: string;
}

export interface StartSwapExceptionAuthorizationOnEditResult {
  updated: HolidaySwap & { status: { statusName: string } };
  workflowStarted: boolean;
}

/**
 * Updates an existing holiday swap that failed an exception-eligible rule
 * (supervisor edit path) to InAuth/inactive instead of blocking the edit,
 * and starts the exception authorization workflow if a published template
 * is registered for it.
 */
export async function startSwapExceptionAuthorizationOnEdit(
  input: StartSwapExceptionAuthorizationOnEditInput,
): Promise<StartSwapExceptionAuthorizationOnEditResult> {
  const statusIds = await loadStatusIds();

  const updated = await prisma.holidaySwap.update({
    where: { holidaySwapId: input.holidaySwapId },
    data: {
      holidayId: input.holidayId,
      originalDate: input.originalDate,
      replacementDate: input.replacementDate,
      statusId: statusIds.pendingAuth,
      active: false,
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    },
    include: { status: { select: { statusName: true } } },
  });

  await auditOrchestrator.log({
    entityName: ENTITY_NAME,
    entityId: String(input.holidaySwapId),
    createdBy: input.updatedBy,
    oldValues: input.before,
    newValues: updated as unknown as Record<string, unknown>,
    comment: `Holiday swap updated and saved pending exception authorization (${input.reasonComment})`,
  });

  const workflowStarted = await instantiateSwapExceptionAuthorizationWorkflow({
    holidaySwapId: input.holidaySwapId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.updatedBy,
  });

  return { updated, workflowStarted };
}
