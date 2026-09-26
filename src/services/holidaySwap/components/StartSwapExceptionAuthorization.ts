import type { HolidaySwap } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { instantiateSwapExceptionAuthorizationWorkflow } from './InstantiateSwapExceptionAuthorizationWorkflow';
import { loadStatusIds } from './LoadStatusIds';

const ENTITY_NAME = 'hsw_holiday_swap';

export interface StartSwapExceptionAuthorizationInput {
  teamMemberId: number;
  holidayId: number;
  originalDate: Date;
  replacementDate: Date;
  createdBy: string;
  /** The acting user's own usr_id — becomes the workflow's ownerUserId, so DYNAMIC/FIRST_SUPERVISOR assignment resolves to their own supervisor. */
  requestedByUserId: number;
  /** Human-readable reason this swap needs authorization, folded into the audit comment. */
  reasonComment: string;
}

export interface StartSwapExceptionAuthorizationResult {
  created: HolidaySwap & { status: { statusName: string } };
  /** False if no published HOLIDAY_SWAP_EXCEPTION_AUTH_TEMPLATE_CODE template exists yet — the record is still saved as InAuth but nothing will authorize it until the template is published. */
  workflowStarted: boolean;
}

/**
 * Saves a new holiday swap that failed an exception-eligible rule as an InAuth
 * exception (instead of blocking it), and starts the exception authorization
 * workflow if a published template is registered for it.
 */
export async function startSwapExceptionAuthorization(
  input: StartSwapExceptionAuthorizationInput,
): Promise<StartSwapExceptionAuthorizationResult> {
  const statusIds = await loadStatusIds();

  const created = await prisma.holidaySwap.create({
    data: {
      teamMemberId: input.teamMemberId,
      holidayId: input.holidayId,
      statusId: statusIds.pendingAuth,
      originalDate: input.originalDate,
      replacementDate: input.replacementDate,
      active: false,
      createdBy: input.createdBy,
    },
    include: { status: { select: { statusName: true } } },
  });

  await auditOrchestrator.log({
    entityName: ENTITY_NAME,
    entityId: String(created.holidaySwapId),
    createdBy: input.createdBy,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
    comment: `Holiday swap created pending exception authorization (${input.reasonComment})`,
  });

  const workflowStarted = await instantiateSwapExceptionAuthorizationWorkflow({
    holidaySwapId: created.holidaySwapId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.createdBy,
  });

  return { created, workflowStarted };
}
