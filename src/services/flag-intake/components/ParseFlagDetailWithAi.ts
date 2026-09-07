import { callFuelIx } from '../../aiInsights/fuelixClient';
import type { FlagDetailItemDTO } from '@shared/dto';

const SYSTEM_PROMPT = `You extract structured facts from a single line of a flagged HR/ops report. \
Given the category and the raw detail line, return a JSON array of up to 4 {"label": string, "value": string} \
pairs capturing the concrete facts (names, dates, counts, mismatches) in the line. Return ONLY the JSON array, \
no prose, no markdown fences. If nothing structured can be extracted, return [].`;

function isFlagDetailItemArray(value: unknown): value is FlagDetailItemDTO[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is FlagDetailItemDTO =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).label === 'string' &&
        typeof (item as Record<string, unknown>).value === 'string',
    )
  );
}

/**
 * Fallback for categories `parseFlagDetail` doesn't recognize. Never throws —
 * on any failure (HTTP error, unparsable JSON, empty result) falls back to a
 * single raw-text entry so the card always has something to show.
 */
export async function parseFlagDetailWithAi(category: string, line: string): Promise<FlagDetailItemDTO[]> {
  const fallback: FlagDetailItemDTO[] = [{ label: 'Detail', value: line }];

  try {
    const response = await callFuelIx({
      model: 'claude-haiku-4-5',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Category: ${category}\nLine: ${line}` },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) return fallback;

    const parsed: unknown = JSON.parse(content);
    if (isFlagDetailItemArray(parsed) && parsed.length > 0) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}
