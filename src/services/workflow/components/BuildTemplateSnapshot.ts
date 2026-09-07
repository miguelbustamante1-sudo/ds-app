import { prisma } from '../../../db/prisma';

/**
 * Fetches one template with all nested relations for read operations.
 */
export async function buildTemplateSnapshot(wflId: string) {
  const template = await prisma.wflWorkflowTemplate.findUnique({
    where: { wflId },
    include: {
      tasks: {
        where: { isActive: true },
        include: {
          inputs: true,
          outcomes: true,
          notifications: true,
        },
      },
      routes: true,
      dependencies: true,
    },
  });
  return template;
}
