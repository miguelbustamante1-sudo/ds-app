import { prisma } from '../../../db/prisma';
import { WorkflowCodeConflictError } from '../errors';

/**
 * Checks wfl_code + wfl_version_no uniqueness before insert or update.
 * Pass excludeWflId to skip the current record on updates.
 */
export async function validateTemplateCode(
  code: string,
  versionNo: number,
  excludeWflId?: string,
): Promise<void> {
  const existing = await prisma.wflWorkflowTemplate.findFirst({
    where: {
      code,
      versionNo,
      ...(excludeWflId !== undefined && { wflId: { not: excludeWflId } }),
    },
    select: { wflId: true },
  });

  if (existing !== null) {
    throw new WorkflowCodeConflictError();
  }
}
