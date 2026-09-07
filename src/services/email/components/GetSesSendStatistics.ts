import { GetSendStatisticsCommand } from '@aws-sdk/client-ses';
import { resolveSesClient } from './ResolveSesClient';
import type { SendDataPointDTO } from '@shared/dto';

export async function getSesSendStatistics(): Promise<SendDataPointDTO[]> {
  const client = resolveSesClient();
  const result = await client.send(new GetSendStatisticsCommand({}));

  return (result.SendDataPoints ?? [])
    .map((point) => ({
      timestamp: (point.Timestamp ?? new Date(0)).toISOString(),
      deliveryAttempts: point.DeliveryAttempts ?? 0,
      bounces: point.Bounces ?? 0,
      complaints: point.Complaints ?? 0,
      rejects: point.Rejects ?? 0,
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
