import { WebClient } from '@slack/web-api';

/**
 * Resolves a Slack user ID from a ds-app user's email address via the Slack
 * Web API. Returns null (rather than throwing) when the lookup fails — a user
 * not present in the Slack workspace, or an email mismatch, should not block
 * delivery on other channels.
 */
export async function resolveSlackUserId(
  client: WebClient,
  email: string,
): Promise<string | null> {
  try {
    const result = await client.users.lookupByEmail({ email });
    return result.user?.id ?? null;
  } catch {
    return null;
  }
}
