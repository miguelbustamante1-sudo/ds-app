import { generateInsights } from './components/GenerateInsights';
import { runChat } from './components/RunChat';
import { resolveAiContext } from './components/ResolveAiContext';
import type { ChatMessage, InsightResult } from './types';

const aiInsightsOrchestrator = {
  async getInsights(
    teamMemberId: number | undefined,
    dsUserId: number | undefined
  ): Promise<InsightResult[]> {
    const ctx = await resolveAiContext(teamMemberId, dsUserId);
    return generateInsights(ctx);
  },

  async chat(
    teamMemberId: number | undefined,
    dsUserId: number | undefined,
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    const ctx = await resolveAiContext(teamMemberId, dsUserId);
    return runChat(history, userMessage, ctx);
  },
};

export default aiInsightsOrchestrator;
