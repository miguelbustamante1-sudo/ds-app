import { getPayrolStatus } from '../repository';
import { PayrolClosedError } from '../errors';

export async function validatePayrolOpen(payrolId: number): Promise<void> {
  const status = await getPayrolStatus(payrolId);
  if (status !== 'Open') {
    throw new PayrolClosedError();
  }
}
