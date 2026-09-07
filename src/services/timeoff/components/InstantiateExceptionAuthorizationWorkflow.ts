import { prisma } from '../../../db/prisma';
import { workflowInstantiationOrchestrator } from '../../workflow/WorkflowInstantiationOrchestrator';
import { TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE } from './ExceptionAuthorizationConstants';

export interface InstantiateExceptionAuthorizationWorkflowInput {
  timeOffId: number;
  /** Becomes the workflow's ownerUserId, so DYNAMIC/FIRST_SUPERVISOR assignment resolves to this user's own supervisor. */
  requestedByUserId: number;
  requestedByEmail: string;
}

/**
 * Looks up the published TIMEOFF_EXCEPTION_AUTH template and, if found, starts a
 * workflow instance for the given time-off record. Returns false if no published
 * template is registered yet — the record stays InAuth but nothing will authorize
 * it until one is published.
 */
export async function instantiateExceptionAuthorizationWorkflow(
  input: InstantiateExceptionAuthorizationWorkflowInput,
): Promise<boolean> {
  const template = await prisma.wflWorkflowTemplate.findFirst({
    where: { code: TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE, status: 'PUBLISHED' },
    select: { wflId: true },
  });

  if (!template) {
    return false;
  }

  await workflowInstantiationOrchestrator.instantiate({
    wflId: template.wflId,
    winName: `Time-off exception authorization — request #${input.timeOffId}`,
    businessReferenceType: 'TimeOff',
    businessReferenceId: String(input.timeOffId),
    ownerUserId: input.requestedByUserId,
    startedBy: input.requestedByEmail,
    createdBy: String(input.requestedByUserId),
  });

  return true;
}
