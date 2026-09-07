import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import type { BonusExternalEntryDTO } from '@shared/dto';

// es.bxi_bonus_external_intake is not Prisma-modeled (dynamic es-schema intake
// table) — inserts go through Prisma.sql tagged templates, which parameterize
// every interpolated value, never $executeRawUnsafe/string concatenation.
export async function insertBonusExternalEntries(
  entries: BonusExternalEntryDTO[],
  createdBy: number,
): Promise<number> {
  const rows = entries.map(
    (entry) =>
      Prisma.sql`(${entry.workdayId}, ${entry.bonusType}, ${entry.amount}, ${entry.month}, ${entry.year}, ${createdBy})`,
  );

  return prisma.$executeRaw(Prisma.sql`
    INSERT INTO es.bxi_bonus_external_intake
      (bxi_workday_id, bxi_bonus_type, bxi_amount, bxi_month, bxi_year, bxi_created_by)
    VALUES ${Prisma.join(rows)}
  `);
}
