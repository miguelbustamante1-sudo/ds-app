import { GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { resolveSesClient } from './ResolveSesClient';
import type { SendQuotaDTO } from '@shared/dto';

export async function getSesSendQuota(): Promise<SendQuotaDTO> {
  const client = resolveSesClient();
  const result = await client.send(new GetSendQuotaCommand({}));

  return {
    max24HourSend: result.Max24HourSend ?? 0,
    maxSendRate: result.MaxSendRate ?? 0,
    sentLast24Hours: result.SentLast24Hours ?? 0,
  };
}
