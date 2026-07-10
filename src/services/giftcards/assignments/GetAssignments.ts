import { prisma } from '../../../db/prisma';
import type { GiftCardAssignmentDTO } from '../../../../shared/dto/GiftCardAssignment';
import type { Prisma } from '@prisma/client';

const ASSIGNMENT_INCLUDE = {
  country:   { select: { countryName: true } },
  pool:      { select: { poolName: true } },
  reason:    { select: { reasonName: true } },
  cardType:  { select: { cardTypeName: true } },
  cardValue: { select: { cardValueAmount: true, cardValueCurrency: true } },
} as const;

type AssignmentWithIncludes = Prisma.GiftCardAssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE;
}>;

function mapAssignment(row: AssignmentWithIncludes): GiftCardAssignmentDTO {
  return {
    assignmentId:           row.assignmentId,
    countryId:              row.countryId,
    countryName:            row.country.countryName,
    poolId:                 row.poolId,
    poolName:               row.pool.poolName,
    reasonId:               row.reasonId,
    reasonName:             row.reason.reasonName,
    cardTypeId:             row.cardTypeId,
    cardTypeName:           row.cardType.cardTypeName,
    cardValueId:            row.cardValueId,
    cardValueAmount:        Number(row.cardValue.cardValueAmount),
    cardValueCurrency:      row.cardValue.cardValueCurrency,
    assignmentAmount:       row.assignmentAmount,
    assignmentComment:      row.assignmentComment,
    assignmentRecipients:   row.assignmentRecipients as string[],
    assignmentEmailMessage: row.assignmentEmailMessage,
    assignmentAuthStatus:   row.assignmentAuthStatus,
    assignmentCreatedAt:    row.assignmentCreatedAt.toISOString(),
  };
}

export async function getAssignments(): Promise<GiftCardAssignmentDTO[]> {
  const rows = await prisma.giftCardAssignment.findMany({
    orderBy: { assignmentId: 'desc' },
    include: ASSIGNMENT_INCLUDE,
  });
  return rows.map(mapAssignment);
}

export async function getAssignmentById(id: number): Promise<GiftCardAssignmentDTO | null> {
  const row = await prisma.giftCardAssignment.findUnique({
    where:   { assignmentId: id },
    include: ASSIGNMENT_INCLUDE,
  });
  if (!row) return null;
  return mapAssignment(row);
}
