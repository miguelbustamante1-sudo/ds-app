import { prisma } from '../../db/prisma';
import type { FlagTypeAction, Prisma } from '@prisma/client';
import type { FlagTypeActionDTO } from '@shared/dto/FlagTypeAction';

export const TABLE = 'fya_flag_type_actions';

function toDTO(row: FlagTypeAction): FlagTypeActionDTO {
  return {
    flagTypeActionId: row.flagTypeActionId,
    category: row.category,
    actionLabel: row.actionLabel,
    actionUrl: row.actionUrl,
    createdBy: row.createdBy,
    createdDate: row.createdDate.toISOString(),
    updatedBy: row.updatedBy,
    updatedDate: row.updatedDate ? row.updatedDate.toISOString() : null,
  };
}

export async function getAllFlagTypeActions(): Promise<FlagTypeActionDTO[]> {
  const rows = await prisma.flagTypeAction.findMany({ orderBy: { category: 'asc' } });
  return rows.map(toDTO);
}

export async function getFlagTypeActionById(id: number): Promise<FlagTypeActionDTO | null> {
  const row = await prisma.flagTypeAction.findUnique({ where: { flagTypeActionId: id } });
  return row ? toDTO(row) : null;
}

export async function getFlagTypeActionsByCategories(categories: string[]): Promise<FlagTypeActionDTO[]> {
  if (categories.length === 0) return [];
  const rows = await prisma.flagTypeAction.findMany({ where: { category: { in: categories } } });
  return rows.map(toDTO);
}

export async function createFlagTypeAction(
  payload: Prisma.FlagTypeActionUncheckedCreateInput,
): Promise<FlagTypeActionDTO> {
  const row = await prisma.flagTypeAction.create({ data: payload });
  return toDTO(row);
}

export async function updateFlagTypeAction(
  id: number,
  payload: Prisma.FlagTypeActionUncheckedUpdateInput,
): Promise<FlagTypeActionDTO> {
  const row = await prisma.flagTypeAction.update({ where: { flagTypeActionId: id }, data: payload });
  return toDTO(row);
}

export async function deleteFlagTypeAction(id: number): Promise<void> {
  await prisma.flagTypeAction.delete({ where: { flagTypeActionId: id } });
}
