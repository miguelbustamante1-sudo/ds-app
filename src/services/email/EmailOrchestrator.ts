import { SendEmailCommand } from '@aws-sdk/client-ses';
import { resolveSesClient } from './components/ResolveSesClient';
import { buildSesPayload } from './components/BuildSesPayload';
import type { SendEmailDTO } from './types';

export class EmailOrchestrator {
  async send(dto: SendEmailDTO): Promise<void> {
    const client = resolveSesClient();
    const input = buildSesPayload(dto);
    const command = new SendEmailCommand(input);
    await client.send(command);
  }
}

export const emailOrchestrator = new EmailOrchestrator();
