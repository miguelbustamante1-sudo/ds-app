/**
 * BuildSesPayload
 * Converts a SendEmailDTO into a SendEmailCommandInput ready for SES.
 * Reads SES_FROM_EMAIL and SES_FROM_NAME from process.env to build the
 * Source field. Throws a configuration error if either is missing.
 */

import type { SendEmailCommandInput } from '@aws-sdk/client-ses';
import type { SendEmailDTO } from '../types';
import { requireEnv } from '../../../utils/env';

/**
 * Builds the SES SendEmailCommandInput from a SendEmailDTO.
 * The caller owns recipient resolution and body content.
 */
export function buildSesPayload(dto: SendEmailDTO): SendEmailCommandInput {
  const fromEmail = requireEnv('SES_FROM_EMAIL');
  const fromName = requireEnv('SES_FROM_NAME');

  const toAddresses: string[] = Array.isArray(dto.to) ? dto.to : [dto.to];

  const source = `${fromName} <${fromEmail}>`;

  const body: SendEmailCommandInput['Message']['Body'] = dto.isHtml === true
    ? { Html: { Data: dto.body, Charset: 'UTF-8' } }
    : { Text: { Data: dto.body, Charset: 'UTF-8' } };

  const input: SendEmailCommandInput = {
    Source: source,
    Destination: {
      ToAddresses: toAddresses,
    },
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
