import { emailOrchestrator } from '../../email/EmailOrchestrator';
import { warn } from '../../../logger';

const DEFAULT_ADMIN_EMAIL = 'maria.cifuentes05@telusdigital.com';

function resolveAdminEmail(): string {
  return process.env.GIFT_CARD_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
}

export interface AdminNotificationContext {
  assignmentId:    number;
  cardTypeName:    string;
  cardValueAmount: number;
  amount:          number;
  reason:          string;
}

export async function sendAdminNotification(ctx: AdminNotificationContext): Promise<void> {
  try {
    await emailOrchestrator.send({
      to:      resolveAdminEmail(),
      subject: `[Gift Cards] Fulfillment failure — Assignment #${ctx.assignmentId}`,
      body: [
        `A gift card assignment could not be fulfilled and was rolled back.`,
        ``,
        `Details:`,
        `  Assignment ID : ${ctx.assignmentId === 0 ? 'N/A (creation failed)' : ctx.assignmentId}`,
        `  Card type     : ${ctx.cardTypeName}`,
        `  Card value    : $${ctx.cardValueAmount}`,
        `  Quantity      : ${ctx.amount}`,
        `  Failure reason: ${ctx.reason}`,
        ``,
        `Please check inventory availability and retry the request.`,
      ].join('\n'),
    });
  } catch (notifyErr) {
    warn('[GiftCard] Admin notification failed:', notifyErr);
  }
}
