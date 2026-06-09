import { callFuelIx } from '../fuelixClient';
import { executeTool } from '../tools/executor';
import { AI_TOOLS } from '../tools/definitions';
import type { AiToolContext, ChatMessage } from '../types';
import type { FuelixMessage } from '../fuelixClient';

const SYSTEM_PROMPT = `
You are a workforce assistant embedded in a team management application.
You have access to tools that query time-off, holiday swaps, and scheduling data.
You can only access data for the user and their direct team — never outside that scope.
Do not reveal any internal IDs, database keys, or system identifiers.
Answer in plain, professional language. Be concise. Always format responses in Markdown — never HTML or any other format. When using Markdown tables, every row including the header and separator must be on its own line — never collapse multiple rows onto a single line.
If asked for information outside your scope, politely decline and explain why.

STRICT DATA RULES — these override everything else:
- Only report what is explicitly present in the tool result. Never infer, estimate, or predict values that are not in the data.
- Never add commentary suggesting what might happen, what the user should expect, or what is likely — only state what the data shows.
- If a field is missing from a tool result, say it is not available. Do not guess its value.
- If a tool returns no records, say there are no results. Do not suggest reasons or possibilities.
- Never fabricate records, dates, durations, names, or statuses that are not in the tool result.
`.trim();

export async function runChat(
  history: ChatMessage[],
  userMessage: string,
  ctx: AiToolContext
): Promise<string> {
  const messages: FuelixMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  for (let i = 0; i < 5; i++) {
    const response = await callFuelIx({
      model: 'claude-sonnet-4-6',
      temperature: 0.3,
      max_tokens: 1024,
      messages,
      tools: AI_TOOLS,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];

    if (!choice) break;

    if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
      return repairMarkdownTables(choice.message.content ?? '');
    }

    // Include tool_calls in the assistant turn so the model recognises its own prior call.
    // Only push if there is content or tool_calls — never push an empty assistant message.
    messages.push({
      role: 'assistant',
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    });

    for (const toolCall of choice.message.tool_calls) {
      let result: unknown;
      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        result = await executeTool(toolCall.function.name, args, ctx);
      } catch {
        result = { error: 'Tool execution failed' };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  return 'I was unable to complete your request. Please try rephrasing your question.';
}

/**
 * Repairs Markdown tables that the model collapsed onto a single line.
 * e.g. "| A | B | |---|---| | 1 | 2 |" → proper newline-separated rows.
 */
export function repairMarkdownTables(text: string): string {
  // Match a line that contains multiple pipe-separated cells run together
  // Pattern: a table fragment where "|" sequences are not separated by \n
  return text.replace(/(\|[^\n]+\|)(\s*\|)/g, '$1\n$2');
}
