import { embedText } from './EmbeddingClient';
import { similaritySearch } from './SopRepository';
import { callFuelIx } from '../aiInsights/fuelixClient';

export interface SopAnswer {
  answer: string;
  sources: string[];
}

export async function answerQuestion(question: string): Promise<SopAnswer> {
  const questionEmbedding = await embedText(question);
  const chunks = await similaritySearch(questionEmbedding, 5);

  if (chunks.length === 0) {
    return {
      answer: "I don't have information about that in the knowledge base.",
      sources: [],
    };
  }

  const contextBlocks = chunks.map((chunk) => {
    const label = chunk.dchSection
      ? `SOP: ${chunk.dchDocName} | Section: ${chunk.dchSection}`
      : `SOP: ${chunk.dchDocName}`;
    return `--- ${label} ---\n${chunk.dchContent}`;
  });

  const systemPrompt = [
    'You are a helpful assistant that answers questions about company SOPs.',
    'Answer only based on the context provided below.',
    "If the answer is not in the context, say \"I don't have information about that in the knowledge base.\" — do not guess.",
    'Format your answer in clear, professional Markdown.',
    '',
    'Context:',
    ...contextBlocks,
  ].join('\n');

  const response = await callFuelIx({
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  const answer =
    response.choices[0]?.message.content ??
    "I couldn't generate a response. Please try again.";

  const sources = [...new Set(chunks.map((c) => c.dchDocName))];

  return { answer, sources };
}
