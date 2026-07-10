import { prisma } from '../../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { GiftCardDocumentationDTO } from '../../../../shared/dto/GiftCardDocumentation';

const DOCUMENTATION_INCLUDE = {
  cardType: { select: { cardTypeName: true } },
} as const;

type DocWithIncludes = Prisma.GiftCardDocumentationGetPayload<{
  include: typeof DOCUMENTATION_INCLUDE;
}>;

function mapDoc(row: DocWithIncludes): GiftCardDocumentationDTO {
  return {
    documentationId: row.documentationId,
    assignmentId:    row.assignmentId,
    value:           Number(row.value),
    cardTypeId:      row.cardTypeId,
    cardTypeName:    row.cardType.cardTypeName,
    cardNumber:      row.cardNumber,
    uploadId:        row.uploadId,
    amountNotSpent:  row.amountNotSpent !== null ? Number(row.amountNotSpent) : null,
    createdBy:       row.createdBy,
    createdAt:       row.createdAt.toISOString(),
  };
}

export async function getDocumentations(): Promise<GiftCardDocumentationDTO[]> {
  const rows = await prisma.giftCardDocumentation.findMany({
    orderBy: { documentationId: 'desc' },
    include: DOCUMENTATION_INCLUDE,
  });
  return rows.map(mapDoc);
}

export async function getDocumentationsByAssignment(assignmentId: number): Promise<GiftCardDocumentationDTO[]> {
  const rows = await prisma.giftCardDocumentation.findMany({
    where:   { assignmentId },
    orderBy: { documentationId: 'desc' },
    include: DOCUMENTATION_INCLUDE,
  });
  return rows.map(mapDoc);
}
