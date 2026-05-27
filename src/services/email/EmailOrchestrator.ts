/**
 * EmailOrchestrator
 * Entry point for the email service domain.
 * Owns only the SES transport concern — no business logic, no recipient
 * resolution, no email templates. Those remain in the calling domain.
 *
 * Usage:
 *   import { emailOrchestrator } from '../email';
 *   await emailOrchestrator.send({ to: '...', subject: '...', body: '...' });
 */

import { SendEmailCommand } from '@aws-sdk/client-ses';
import { resolveSesClient } from './components/ResolveSesClient';
import { buildSesPayload } from './components/BuildSesPayload';
import type { SendEmailDTO } from './types';

export class EmailOrchestrator {
  /**
   * Sends a transactional email via AWS SES.
   * Throws on any SES error — the caller decides how to handle it.
   * No retry logic, no silent swallowing.
   */
  async send(dto: SendEmailDTO): Promise<void> {
    const client = resolveSesClient();
    const input = buildSesPayload(dto);
    const command = new SendEmailCommand(input);
    await client.send(command);
  }
}

export const emailOrchestrator = new EmailOrchestrator();
