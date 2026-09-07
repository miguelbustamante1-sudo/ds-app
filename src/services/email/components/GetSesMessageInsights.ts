import { GetMessageInsightsCommand, NotFoundException } from '@aws-sdk/client-sesv2';
import { resolveSesV2Client } from './ResolveSesV2Client';
import { MessageInsightsNotFoundError } from '../errors';
import type { MessageInsightsDTO } from '@shared/dto';

export async function getSesMessageInsights(messageId: string): Promise<MessageInsightsDTO> {
  const client = resolveSesV2Client();

  try {
    const result = await client.send(new GetMessageInsightsCommand({ MessageId: messageId }));

    return {
      messageId: result.MessageId ?? messageId,
      ...(result.FromEmailAddress !== undefined ? { fromEmailAddress: result.FromEmailAddress } : {}),
      ...(result.Subject !== undefined ? { subject: result.Subject } : {}),
      insights: (result.Insights ?? []).map((insight) => ({
        ...(insight.Destination !== undefined ? { destination: insight.Destination } : {}),
        ...(insight.Isp !== undefined ? { isp: insight.Isp } : {}),
        events: (insight.Events ?? []).map((event) => ({
          timestamp: (event.Timestamp ?? new Date(0)).toISOString(),
          type: event.Type ?? 'UNKNOWN',
          ...(event.Details?.Bounce?.BounceType !== undefined
            ? { bounceType: event.Details.Bounce.BounceType }
            : {}),
          ...(event.Details?.Bounce?.BounceSubType !== undefined
            ? { bounceSubType: event.Details.Bounce.BounceSubType }
            : {}),
          ...(event.Details?.Complaint?.ComplaintSubType !== undefined
            ? { complaintSubType: event.Details.Complaint.ComplaintSubType }
            : {}),
        })),
      })),
    };
  } catch (err: unknown) {
    if (err instanceof NotFoundException) {
      throw new MessageInsightsNotFoundError(messageId);
    }
    throw err;
  }
}
