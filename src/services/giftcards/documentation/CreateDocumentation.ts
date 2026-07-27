import { prisma } from '../../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { GiftCardDocumentationDTO } from '../../../../shared/dto/GiftCardDocumentation';
import { GiftCardValidationError } from '../errors';

export interface CreateDocumentationInput {
  assignmentId:    number;
  value:           number;
  cardTypeId:      number;
  cardNumber:      string;
  uploadId:        number;
  amountNotSpent?: number;
  createdBy:       number;
}

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

export function validateCreateDocumentation(
  raw: Record<string, unknown>,
  createdBy: number,
): CreateDocumentationInput {
  const { assignmentId, value, cardTypeId, cardNumber, uploadId, amountNotSpent } = raw;

  if (typeof assignmentId !== 'number' || !Number.isInteger(assignmentId) || assignmentId < 1) {
    throw new GiftCardValidationError('`assignmentId` is required and must be a positive integer');
  }
  if (typeof value !== 'number' || value <= 0) {
    throw new GiftCardValidationError('`value` is required and must be a positive number');
  }
  if (typeof cardTypeId !== 'number' || !Number.isInteger(cardTypeId) || cardTypeId < 1) {
    throw new GiftCardValidationError('`cardTypeId` is required and must be a positive integer');
  }
  if (typeof cardNumber !== 'string' || cardNumber.trim() === '') {
    throw new GiftCardValidationError('`cardNumber` is required');
  }
  if (typeof uploadId !== 'number' || !Number.isInteger(uploadId) || uploadId < 1) {
    throw new GiftCardValidationError('`uploadId` is required and must be a positive integer');
  }
  if (amountNotSpent !== undefined && amountNotSpent !== null) {
    if (typeof amountNotSpent !== 'number' || amountNotSpent < 0) {
      throw new GiftCardValidationError('`amountNotSpent` must be a non-negative number');
    }
  }

  return {
    assignmentId,
    value,
    cardTypeId,
    cardNumber: cardNumber.trim(),
    uploadId,
    ...(typeof amountNotSpent === 'number' ? { amountNotSpent } : {}),
    createdBy,
  };
}

export async function createDocumentation(data: CreateDocumentationInput): Promise<GiftCardDocumentationDTO> {
  const assignment = await prisma.giftCardAssignment.findUnique({ where: { assignmentId: data.assignmentId } });
  if (!assignment) throw new GiftCardValidationError('Assignment not found');

  const cardType = await prisma.giftCardType.findUnique({ where: { cardTypeId: data.cardTypeId } });
  if (!cardType || !cardType.cardTypeIsActive) throw new GiftCardValidationError('Card type not found or inactive');

  const upload = await prisma.upload.findUnique({ where: { uploadId: data.uploadId } });
  if (!upload) throw new GiftCardValidationError('Upload not found');

  const row = await prisma.giftCardDocumentation.create({
    data: {
      assignmentId:   data.assignmentId,
      value:          data.value,
      cardTypeId:     data.cardTypeId,
      cardNumber:     data.cardNumber,
      uploadId:       data.uploadId,
      amountNotSpent: data.amountNotSpent ?? null,
      createdBy:      data.createdBy,
    },
    include: DOCUMENTATION_INCLUDE,
  });

  return mapDoc(row);
}
