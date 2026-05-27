import type { SendEmailCommandInput } from '@aws-sdk/client-ses';
import type { SendEmailDTO } from '../types';
import { requireEnv } from '../../../utils/env';

let cachedFromEmail: string | null = null;
let cachedFromName: string | null = null;

export function buildSesPayload(dto: SendEmailDTO): SendEmailCommandInput {
  if (cachedFromEmail === null) cachedFromEmail = requireEnv('SES_FROM_EMAIL');
  if (cachedFromName === null) cachedFromName = requireEnv('SES_FROM_NAME');

  const toAddresses: string[] = Array.isArray(dto.to) ? dto.to : [dto.to];
  const source = `${cachedFromName} <${cachedFromEmail}>`;

  const body: NonNullable<SendEmailCommandInput['Message']>['Body'] = dto.isHtml === true
    ? { Html: { Data: dto.body, Charset: 'UTF-8' } }
    : { Text: { Data: dto.body, Charset: 'UTF-8' } };

  const input: SendEmailCommandInput = {
    Source: source,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: { Data: dto.subject, Charset: 'UTF-8' },
      Body: body,
    },
  };

  if (dto.replyTo !== undefined) {
    input.ReplyToAddresses = [dto.replyTo];
  }

  return input;
}

// Exposed only for test teardown — resets cached sender config so tests can inject different env vars.
export function _resetBuildSesPayloadForTesting(): void {
  cachedFromEmail = null;
  cachedFromName = null;
}
