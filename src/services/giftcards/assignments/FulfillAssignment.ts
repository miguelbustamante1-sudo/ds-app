import type { Prisma } from '@prisma/client';
import { selectInventoryCards, type InventoryCard } from '../inventory/SelectInventoryCards';
import { emailOrchestrator } from '../../email/EmailOrchestrator';
import { InsufficientInventoryError } from '../errors';

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface FulfillArgs {
  assignmentId:     number;
  cardTypeName:     string;
  cardValueAmount:  number;
  cardValueCurrency: string;
  recipients:       string[];
  amount:           number;
  emailMessage?:    string | null | undefined;
}

export async function fulfillWithinTransaction(tx: TxClient, args: FulfillArgs): Promise<void> {
  const { assignmentId, cardTypeName, cardValueAmount, cardValueCurrency, recipients, amount, emailMessage } = args;

  const cards = await selectInventoryCards(tx, cardTypeName, cardValueAmount, amount);

  if (cards.length < amount) {
    throw new InsufficientInventoryError(amount, cards.length, cardTypeName, cardValueAmount);
  }

  if (recipients.length === 1) {
    // All cards go to one recipient in a single email
    await emailOrchestrator.send({
      to:     recipients[0]!,
      subject: `Your ${cardTypeName} gift card${amount > 1 ? 's have' : ' has'} been assigned`,
      isHtml: false,
      body:   buildMultiCardBody(cards, cardValueCurrency, cardValueAmount, emailMessage),
    });

    for (const card of cards) {
      await tx.$executeRawUnsafe(
        `UPDATE es.gci_gift_card_inventory SET gci_assigned_id = $1 WHERE gci_id = $2`,
        assignmentId,
        card.gci_id,
      );
    }
  } else {
    // One card per recipient, one email each
    for (let i = 0; i < amount; i++) {
      const card      = cards[i];
      const recipient = recipients[i];
      if (!card || !recipient) continue; // structurally impossible after length check

      await emailOrchestrator.send({
        to:      recipient,
        subject: `Your ${cardTypeName} gift card has been assigned`,
        isHtml:  false,
        body:    buildSingleCardBody(card, cardValueCurrency, cardValueAmount, emailMessage),
      });

      await tx.$executeRawUnsafe(
        `UPDATE es.gci_gift_card_inventory SET gci_assigned_id = $1 WHERE gci_id = $2`,
        assignmentId,
        card.gci_id,
      );
    }
  }
}

function buildSingleCardBody(
  card:     InventoryCard,
  currency: string,
  amount:   number,
  message:  string | null | undefined,
): string {
  const lines = [
    'The following card has been assigned to you:',
    '',
    `  Code           : ${card.gci_codigo}`,
  ];
  if (card.gci_pin) lines.push(`  PIN            : ${card.gci_pin}`);
  lines.push(`  Value          : ${currency} ${amount.toFixed(2)}`);
  lines.push(`  Expiration date: ${card.gci_expiracion.toISOString().slice(0, 10)}`);
  if (message) lines.push('', message);
  return lines.join('\n');
}

function buildMultiCardBody(
  cards:    InventoryCard[],
  currency: string,
  amount:   number,
  message:  string | null | undefined,
): string {
  const lines = [
    `The following cards have been assigned to you (value: ${currency} ${amount.toFixed(2)} each):`,
    '',
  ];
  for (const card of cards) {
    const pin = card.gci_pin ? ` | PIN: ${card.gci_pin}` : '';
    lines.push(`  - Code: ${card.gci_codigo}${pin} | Expires: ${card.gci_expiracion.toISOString().slice(0, 10)}`);
  }
  if (message) lines.push('', message);
  return lines.join('\n');
}
