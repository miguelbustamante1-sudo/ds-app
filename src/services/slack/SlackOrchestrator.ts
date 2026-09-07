import { WebClient } from '@slack/web-api';
import { resolveSlackUserId } from './components/ResolveSlackUserId';
import { info } from '../../logger';

export interface SendSlackDTO {
  userEmail: string;
  message: string;
}

export class SlackOrchestrator {
  /**
   * DMs a ds-app user on Slack, resolving their Slack user ID from their
   * ds-app email via users.lookupByEmail. Returns the posted message's ts
   * (timestamp ID), or null if the user could not be resolved on Slack or
   * (in local dev) delivery was skipped.
   */
  async send(dto: SendSlackDTO): Promise<string | null> {
    // When LOCAL_SLACK=true in .env.local, print to console instead of sending via Slack.
    if (process.env.LOCAL_SLACK === 'true') {
      info(`[Slack:LOCAL] To: ${dto.userEmail}\n${dto.message}`);
      return null;
    }

    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      info(`[Slack] SLACK_BOT_TOKEN not configured — skipping message to ${dto.userEmail}`);
      return null;
    }

    const client = new WebClient(token);

    const slackUserId = await resolveSlackUserId(client, dto.userEmail);
    if (!slackUserId) {
      info(`[Slack] No Slack user found for ${dto.userEmail} — skipping`);
      return null;
    }

    const conversation = await client.conversations.open({ users: slackUserId });
    const channelId = conversation.channel?.id;
    if (!channelId) {
      info(`[Slack] Could not open DM channel for ${dto.userEmail} — skipping`);
      return null;
    }

    const result = await client.chat.postMessage({ channel: channelId, text: dto.message });
    return result.ts ?? null;
  }
}

export const slackOrchestrator = new SlackOrchestrator();
