import { RejectionReasonRequiredError } from '../errors';

export function validateRejectionReason(reason: string | undefined | null): void {
  if (!reason || reason.trim().length === 0) {
    throw new RejectionReasonRequiredError();
  }
}
