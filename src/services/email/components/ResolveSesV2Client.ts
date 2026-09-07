import { SESv2Client } from '@aws-sdk/client-sesv2';
import { requireEnv } from '../../../utils/env';

let client: SESv2Client | null = null;

export function resolveSesV2Client(): SESv2Client {
  if (client === null) {
    const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');
    const region = requireEnv('AWS_REGION');

    client = new SESv2Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return client;
}

// Exposed only for test teardown — forces the next call to re-read credentials from env.
export function _resetSesV2ClientForTesting(): void {
  client = null;
}
