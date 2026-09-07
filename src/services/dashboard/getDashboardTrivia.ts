/**
 * Dashboard Trivia Service
 *
 * Generates trivia questions from the TL manual using the existing Fuel iX
 * client. The manual only changes when someone re-uploads it to GCS, so the
 * generated questions are cached in memory for CACHE_TTL_MS and reused across
 * requests instead of calling the LLM on every dashboard load.
 *
 * Flow:
 *   1. Serve the cache if it's still fresh.
 *   2. Otherwise: load the TL manual (loadTlManual), ask Fuel iX
 *      (claude-sonnet-4-6) to produce questions as a JSON array, parse +
 *      strictly validate the response (parseTriviaResponse), cache it.
 *
 * Errors are surfaced as AppError so the route's catch block maps them to the
 * correct HTTP status (502 for AI failures, 500 for missing manual).
 */

import { callFuelIx } from '../aiInsights/fuelixClient';
import type { TriviaQuestionDTO } from '@shared/dto';
import { loadTlManual } from './components/loadTlManual';
import { parseTriviaResponse } from './components/parseTriviaResponse';

const QUESTION_COUNT = 5;
const OPTIONS_PER_QUESTION = 4;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const SYSTEM_PROMPT = `
You are a trivia question generator for a team management application.
You are given a Team Leader manual as your only source of knowledge.

Produce exactly ${QUESTION_COUNT} multiple-choice trivia questions grounded strictly
in the provided manual. Do not invent facts that are not supported by the manual.

Output rules (STRICT):
- Return ONLY a JSON array. No prose, no explanations, no markdown code fences.
- Each element must be an object with exactly these keys:
    "question": string,
    "options": array of exactly ${OPTIONS_PER_QUESTION} distinct strings,
    "correctOptionIndex": integer from 0 to ${OPTIONS_PER_QUESTION - 1} (0-based index into "options")
- Exactly one option is correct, identified by "correctOptionIndex".
- Questions and options must be concise and unambiguous.
`.trim();

interface TriviaCacheEntry {
  questions: TriviaQuestionDTO[];
  generatedAtMs: number;
}

let cache: TriviaCacheEntry | undefined;

function isCacheFresh(entry: TriviaCacheEntry | undefined): entry is TriviaCacheEntry {
  return !!entry && Date.now() - entry.generatedAtMs < CACHE_TTL_MS;
}

async function generateTrivia(): Promise<TriviaQuestionDTO[]> {
  const manual = await loadTlManual();

  const response = await callFuelIx({
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Team Leader manual:\n\n${manual}\n\nReturn exactly ${QUESTION_COUNT} trivia questions as a JSON array following the output rules.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  return parseTriviaResponse(raw);
}

export async function getDashboardTrivia(): Promise<TriviaQuestionDTO[]> {
  if (isCacheFresh(cache)) {
    return cache.questions;
  }

  const questions = await generateTrivia();
  cache = { questions, generatedAtMs: Date.now() };
  return questions;
}
