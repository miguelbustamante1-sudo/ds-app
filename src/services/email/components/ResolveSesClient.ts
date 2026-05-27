import { SESClient } from '@aws-sdk/client-ses';
import { requireEnv } from '../../../utils/env';

let client: SESClient | null = null;

export function resolveSesClient(): SESClient {
  if (client === null) {
    const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');
    const region = requireEnv('AWS_REGION');

    client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return client;
}

// Exposed only for test teardown — forces the next call to re-read credentials from env.
export function _resetSesClientForTesting(): void {
  client = null;
}
