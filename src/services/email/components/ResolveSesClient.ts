/**
 * ResolveSesClient
 * Lazily builds and caches a SESClient singleton.
 * Credentials are read and validated on the first call to resolveSesClient(),
 * so the app can start without AWS vars present — the error only surfaces
 * when the email feature is actually used.
 */

import { SESClient } from '@aws-sdk/client-ses';
import { requireEnv } from '../../../utils/env';

let client: SESClient | null = null;

/**
 * Returns the cached SESClient, creating it on first use.
 * Throws if any required AWS credential variable is missing or empty.
 */
export function resolveSesClient(): SESClient {
  if (client === null) {
    const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');
    const region = requireEnv('AWS_REGION');

    client = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return client;
}
