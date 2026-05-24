import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';

/**
 * Ensures both wtkFromId and wtkToId belong to the template identified by wflId.
 */
export async function validateTaskRoutes(
  wflId: string,
  wtkFromId: string,
  wtkToId: string,
): Promise<void> {
  const [fromTask, toTask] = await Promise.all([
    prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId: wtkFromId, wflId },
      select: { wtkId: true },
    }),
    prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId: wtkToId, wflId },
      select: { wtkId: true },
    }),
  ]);

  if (fromTask === null) {
    throw new AppError('Source task does not belong to this template', 400);
  }
  if (toTask === null) {
    throw new AppError('Destination task does not belong to this template', 400);
  }
}
