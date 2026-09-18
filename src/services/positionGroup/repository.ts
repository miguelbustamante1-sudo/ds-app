import { prisma } from '../../db/prisma';
import type { TechnologyDTO, DerivedGroupDTO } from '@shared/dto';

/**
 * Technologies a position actually varies by. Empty array means the position has a
 * single fixed Group regardless of technology (or isn't mapped at all yet) — the
 * frontend should not show a Technology selector in that case.
 */
export async function getTechnologiesForPosition(posId: number): Promise<TechnologyDTO[]> {
  const rows = await prisma.positionGroupMapping.findMany({
    where: { posId, tecId: { not: null } },
    select: { technology: { select: { technologyId: true, technologyName: true } } },
    orderBy: { technology: { technologyName: 'asc' } },
  });

  return rows
    .map((r) => r.technology)
    .filter((t): t is NonNullable<typeof t> => t !== null);
}

/**
 * Derives a Group from Position (+ Technology). Never throws — returns null fields when
 * no mapping row exists yet, so the endorsement form can fall back to the manual picker.
 *
 * When tecId is given, the technology-specific row is tried first; otherwise (and when no
 * technology-specific row matches) the position's fixed row (tec_id IS NULL) is used.
 */
export async function findPositionGroup(posId: number, tecId: number | null): Promise<DerivedGroupDTO> {
  if (tecId !== null) {
    const specific = await prisma.positionGroupMapping.findFirst({
      where: { posId, tecId },
      select: { group: { select: { groupId: true, groupName: true } } },
    });
    if (specific) {
      return { groupId: specific.group.groupId, groupName: specific.group.groupName };
    }
  }

  const fixed = await prisma.positionGroupMapping.findFirst({
    where: { posId, tecId: null },
    select: { group: { select: { groupId: true, groupName: true } } },
  });

  if (!fixed) {
    return { groupId: null, groupName: null };
  }

  return { groupId: fixed.group.groupId, groupName: fixed.group.groupName };
}
