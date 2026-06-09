import { callFuelIx } from '../fuelixClient';
import { executeTool } from '../tools/executor';
import type { AiToolContext, InsightResult } from '../types';

const SYSTEM_PROMPT = `
You are a workforce assistant for a team management application.
Generate exactly 2 concise, actionable insights based on the data provided.
Each insight must be one sentence. Be direct. Do not reference any IDs or internal codes.
Format your response as a JSON array of exactly 2 strings.
`.trim();

export async function generateInsights(ctx: AiToolContext): Promise<InsightResult[]> {
  const [tentative, monthly, density] = await Promise.all([
    executeTool('get_upcoming_tentative', {}, ctx),
    executeTool('get_monthly_summary', {}, ctx),
    executeTool('get_coverage_density', {}, ctx),
  ]);

  const response = await callFuelIx({
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Team data:\n${JSON.stringify({ tentative, monthly, density })}\n\nReturn exactly 2 insight strings as a JSON array.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '[]';

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as string[]).slice(0, 2).map((message) => ({ message }));
  } catch {
    return [{ message: raw.slice(0, 200) }];
  }
}
