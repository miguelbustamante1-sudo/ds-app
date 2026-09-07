import { SendEmailCommand } from '@aws-sdk/client-ses';
import { resolveSesClient } from './components/ResolveSesClient';
import { buildSesPayload } from './components/BuildSesPayload';
import { getSesSendStatistics } from './components/GetSesSendStatistics';
import { getSesSendQuota } from './components/GetSesSendQuota';
import { getSesMessageInsights } from './components/GetSesMessageInsights';
import type { SendEmailDTO, SendStatisticsReportDTO, MessageInsightsDTO } from '@shared/dto';
import { info } from '../../logger';

export class EmailOrchestrator {
  async send(dto: SendEmailDTO): Promise<string | null> {
    // When LOCAL_EMAIL=true in .env.local, print to console instead of sending via SES.
    if (process.env.LOCAL_EMAIL === 'true') {
      const to = Array.isArray(dto.to) ? dto.to.join(', ') : dto.to;
      info(`[Email:LOCAL] To: ${to} | Subject: ${dto.subject}\n${dto.body}`);
      return null;
    }
    const client  = resolveSesClient();
    const input   = buildSesPayload(dto);
    const command = new SendEmailCommand(input);
    const result  = await client.send(command);
    return result.MessageId ?? null;
  }

  async getStatisticsReport(): Promise<SendStatisticsReportDTO> {
    const [dataPoints, quota] = await Promise.all([
      getSesSendStatistics(),
      getSesSendQuota(),
    ]);

    return { dataPoints, quota };
  }

  async getMessageInsights(messageId: string): Promise<MessageInsightsDTO> {
    return getSesMessageInsights(messageId);
  }
}

export const emailOrchestrator = new EmailOrchestrator();
