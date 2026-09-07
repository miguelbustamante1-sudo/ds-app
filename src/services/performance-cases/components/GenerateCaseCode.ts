import { prisma } from '../../../db/prisma';

export async function generateCaseCode(now: Date): Promise<string> {
  const year = now.getFullYear();
  const prefix = `PMC-${year}-`;
  const count = await prisma.performanceCase.count({
    where: { caseCode: { startsWith: prefix } },
  });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}
