import { prisma } from '../../../db/prisma';
import type { GiftCardAssignmentDTO } from '../../../../shared/dto/GiftCardAssignment';
import { GiftCardValidationError } from '../errors';
import { fulfillWithinTransaction } from './FulfillAssignment';
import { sendAdminNotification } from '../inventory/SendAdminNotification';
import { error } from '../../../logger';

export interface CreateAssignmentInput {
  countryId:               number;
  poolId:                  number;
  reasonId:                number;
  cardTypeId:              number;
  cardValueId:             number;
  assignmentAmount:        number;
  assignmentComment?:      string | undefined;
  assignmentRecipients:    string[];
  assignmentEmailMessage?: string | undefined;
  assignmentCreatedBy:     number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateAssignment(
  raw: Record<string, unknown>,
  assignmentCreatedBy: number,
): CreateAssignmentInput {
  const {
    countryId, poolId, reasonId, cardTypeId, cardValueId,
    assignmentAmount, assignmentComment, assignmentRecipients, assignmentEmailMessage,
  } = raw;

  if (typeof countryId !== 'number' || !Number.isInteger(countryId)) {
    throw new GiftCardValidationError('`countryId` is required and must be an integer');
  }
  if (typeof poolId !== 'number' || !Number.isInteger(poolId)) {
    throw new GiftCardValidationError('`poolId` is required and must be an integer');
  }
  if (typeof reasonId !== 'number' || !Number.isInteger(reasonId)) {
    throw new GiftCardValidationError('`reasonId` is required and must be an integer');
  }
  if (typeof cardTypeId !== 'number' || !Number.isInteger(cardTypeId)) {
    throw new GiftCardValidationError('`cardTypeId` is required and must be an integer');
  }
  if (typeof cardValueId !== 'number' || !Number.isInteger(cardValueId)) {
    throw new GiftCardValidationError('`cardValueId` is required and must be an integer');
  }
  if (typeof assignmentAmount !== 'number' || !Number.isInteger(assignmentAmount) || assignmentAmount < 1) {
    throw new GiftCardValidationError('`assignmentAmount` is required and must be a positive integer');
  }
  if (!Array.isArray(assignmentRecipients) || assignmentRecipients.length === 0) {
    throw new GiftCardValidationError('`assignmentRecipients` is required and must be a non-empty array of emails');
  }

  const recipients = assignmentRecipients.map((r) => String(r).trim()).filter((r) => r !== '');

  for (const email of recipients) {
    if (!EMAIL_REGEX.test(email)) {
      throw new GiftCardValidationError(`"${email}" is not a valid email address`);
    }
  }

  // Valid combinations:
  //   - 1 recipient  → all cards delivered to that person in one email
  //   - N recipients = amount → one card per person, one email each
  // Any other combination is invalid.
  if (recipients.length !== 1 && recipients.length !== assignmentAmount) {
    throw new GiftCardValidationError(
      `Invalid recipient count (${recipients.length}). ` +
      `Provide exactly 1 recipient (receives all ${assignmentAmount} card(s)) ` +
      `or exactly ${assignmentAmount} recipients (one card each).`,
    );
  }

  return {
    countryId,
    poolId,
    reasonId,
    cardTypeId,
    cardValueId,
    assignmentAmount,
    assignmentComment:      typeof assignmentComment === 'string' ? assignmentComment.trim() : undefined,
    assignmentRecipients:   recipients,
    assignmentEmailMessage: typeof assignmentEmailMessage === 'string' ? assignmentEmailMessage.trim() : undefined,
    assignmentCreatedBy,
  };
}

export async function createAssignment(data: CreateAssignmentInput): Promise<GiftCardAssignmentDTO> {
  // Validate catalog entries (read-only — outside the transaction)
  const pool = await prisma.giftCardPool.findUnique({ where: { poolId: data.poolId } });
  if (!pool || !pool.poolIsActive) throw new GiftCardValidationError('Pool does not exist or is inactive');

  const reason = await prisma.giftCardReason.findUnique({ where: { reasonId: data.reasonId } });
  if (!reason || !reason.reasonIsActive) throw new GiftCardValidationError('Reason does not exist or is inactive');

  const cardType = await prisma.giftCardType.findUnique({ where: { cardTypeId: data.cardTypeId } });
  if (!cardType || !cardType.cardTypeIsActive) throw new GiftCardValidationError('Card type does not exist or is inactive');

  const cardValue = await prisma.giftCardValue.findUnique({ where: { cardValueId: data.cardValueId } });
  if (!cardValue || !cardValue.cardValueIsActive) throw new GiftCardValidationError('Card value does not exist or is inactive');
  if (cardValue.cardTypeId !== data.cardTypeId) throw new GiftCardValidationError('Card value does not belong to the selected card type');

  const cardTypeName    = cardType.cardTypeName;
  const cardValueAmount = Number(cardValue.cardValueAmount);

  // Track the assignment ID so the admin notification has context even if the transaction rolls back
  let assignmentId: number | undefined;

  try {
    let result!: GiftCardAssignmentDTO;

    await prisma.$transaction(async (tx) => {
      const row = await tx.giftCardAssignment.create({
        data: {
          countryId:              data.countryId,
          poolId:                 data.poolId,
          reasonId:               data.reasonId,
          cardTypeId:             data.cardTypeId,
          cardValueId:            data.cardValueId,
          assignmentAmount:       data.assignmentAmount,
          assignmentComment:      data.assignmentComment ?? null,
          assignmentRecipients:   data.assignmentRecipients,
          assignmentEmailMessage: data.assignmentEmailMessage ?? null,
          assignmentAuthStatus:   'Authorized',
          assignmentCreatedBy:    data.assignmentCreatedBy,
        },
        include: {
          country:   { select: { countryName: true } },
          pool:      { select: { poolName: true } },
          reason:    { select: { reasonName: true } },
          cardType:  { select: { cardTypeName: true } },
          cardValue: { select: { cardValueAmount: true, cardValueCurrency: true } },
          createdBy: { select: { userName: true } },
        },
      });

      assignmentId = row.assignmentId;

      await fulfillWithinTransaction(tx, {
        assignmentId:      row.assignmentId,
        cardTypeName,
        cardValueAmount,
        cardValueCurrency: cardValue.cardValueCurrency,
        recipients:        data.assignmentRecipients,
        amount:            data.assignmentAmount,
        emailMessage:      data.assignmentEmailMessage,
      });

      result = {
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
        assignmentCreatedBy:    row.assignmentCreatedBy,
        assignmentCreatedByUserName: row.createdBy?.userName ?? null,
        assignmentCreatedAt:    row.assignmentCreatedAt.toISOString(),
      };
    });

    return result;
  } catch (err) {
    await sendAdminNotification({
      assignmentId:    assignmentId ?? 0,
      cardTypeName,
      cardValueAmount,
      amount:          data.assignmentAmount,
      reason:          err instanceof Error ? err.message : 'Unknown error',
    });
    error('[GiftCard] createAssignment failed, transaction rolled back:', err);
    throw err;
  }
}
