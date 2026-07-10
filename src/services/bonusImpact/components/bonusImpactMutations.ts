import { prisma } from '../../../db/prisma';
import type { BniBonus } from '@prisma/client';
import { CreateBonusImpactDTO, ProcessBonusImpactDTO } from '../../../../shared/dto/BonusImpact';
import { AppError } from '../../../errors/AppError';
import { fetchRawBonusImpactRow } from './bonusImpactQueries';

export async function createBonusImpact(dto: CreateBonusImpactDTO, createdBy: number): Promise<BniBonus> {
  return prisma.bniBonus.create({
    data: {
      bniTeamMemberId: dto.bniTeamMemberId,
      bniDescription: dto.bniDescription,
      bniComment: dto.bniComment ?? null,
      bniAmount: dto.bniAmount ?? 1,
      bniCurrency: dto.bniCurrency ?? 'USD',
      bniMonth: new Date(dto.bniMonth),
      bniStatus: 'Registered',
      bniCreatedBy: createdBy,
      bniUpdatedBy: createdBy,
    },
  });
}

export async function notifyBonusImpact(bniId: number, updatedBy: number): Promise<{ before: BniBonus; after: BniBonus }> {
  const before = await fetchRawBonusImpactRow(bniId);
  if (!before || before.bniDeletedAt) throw new AppError('Bonus impact not found', 404);
  if (before.bniStatus !== 'Registered') {
    throw new AppError('Only Registered impacts can be marked as Notified', 400);
  }
  const after = await prisma.bniBonus.update({
    where: { bniId },
    data: { bniStatus: 'Notified', bniNotifiedAt: new Date(), bniUpdatedBy: updatedBy },
  });
  return { before, after };
}

export async function processBonusImpact(bniId: number, dto: ProcessBonusImpactDTO, updatedBy: number): Promise<{ before: BniBonus; after: BniBonus }> {
  const before = await fetchRawBonusImpactRow(bniId);
  if (!before || before.bniDeletedAt) throw new AppError('Bonus impact not found', 404);
  if (before.bniStatus !== 'Notified') {
    throw new AppError('Only Notified impacts can be processed', 400);
  }
  const after = await prisma.bniBonus.update({
    where: { bniId },
    data: {
      bniStatus: 'Processed',
      bniPrlId: dto.bniPrlId,
      bniProcessedAt: new Date(),
      bniUpdatedBy: updatedBy,
    },
  });
  return { before, after };
}

export async function dropBonusImpact(bniId: number, updatedBy: number): Promise<{ before: BniBonus }> {
  const before = await fetchRawBonusImpactRow(bniId);
  if (!before || before.bniDeletedAt) throw new AppError('Bonus impact not found', 404);
  if (before.bniStatus === 'Processed') {
    throw new AppError('Processed impacts cannot be dropped', 400);
  }
  await prisma.bniBonus.update({
    where: { bniId },
    data: { bniStatus: 'Dropped', bniDeletedAt: new Date(), bniUpdatedBy: updatedBy },
  });
  return { before };
}
