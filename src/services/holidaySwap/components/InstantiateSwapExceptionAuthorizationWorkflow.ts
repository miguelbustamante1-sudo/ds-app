import { prisma } from '../../../db/prisma';
import { workflowInstantiationOrchestrator } from '../../workflow/WorkflowInstantiationOrchestrator';
import { HOLIDAY_SWAP_EXCEPTION_AUTH_TEMPLATE_CODE } from './SwapExceptionAuthorizationConstants';

export interface InstantiateSwapExceptionAuthorizationWorkflowInput {
  holidaySwapId: number;
  /** Becomes the workflow's ownerUserId, so DYNAMIC/FIRST_SUPERVISOR assignment resolves to this user's own supervisor. */
  requestedByUserId: number;
  requestedByEmail: string;
}

/**
 * Looks up the published HOLIDAY_SWAP_EXCEPTION_AUTH template and, if found,
 * starts a workflow instance for the given holiday swap record. Returns false
 * if no published template is registered yet — the record stays InAuth but
 * nothing will authorize it until one is published.
 */
export async function instantiateSwapExceptionAuthorizationWorkflow(
  input: InstantiateSwapExceptionAuthorizationWorkflowInput,
): Promise<boolean> {
  const template = await prisma.wflWorkflowTemplate.findFirst({
    where: { code: HOLIDAY_SWAP_EXCEPTION_AUTH_TEMPLATE_CODE, status: 'PUBLISHED' },
    select: { wflId: true },
  });

  if (!template) {
    return false;
  }

  await workflowInstantiationOrchestrator.instantiate({
    wflId: template.wflId,
    winName: `Holiday swap exception authorization — swap #${input.holidaySwapId}`,
    businessReferenceType: 'HolidaySwap',
    businessReferenceId: String(input.holidaySwapId),
    ownerUserId: input.requestedByUserId,
    startedBy: input.requestedByEmail,
    createdBy: String(input.requestedByUserId),
  });

  return true;
}
