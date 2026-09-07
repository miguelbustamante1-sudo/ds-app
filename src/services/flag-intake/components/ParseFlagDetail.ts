import type { FlagDetailItemDTO } from '@shared/dto';

/** Strips the `<workdayId>-<name>-<supervisor>-` prefix common to CSV-intake concatenate strings, returning the remainder. */
function stripCommonPrefix(line: string): string | null {
  const parts = line.split('-');
  if (parts.length < 4) return null;
  const workdayId = parts[0];
  if (workdayId === undefined || !/^\d+$/.test(workdayId.trim())) return null;
  return parts.slice(3).join('-').trim();
}

function secondDescriptionLine(description: string): string | null {
  const lines = description.split('\n');
  const second = lines.length >= 2 ? lines[1] : lines[0];
  return second ?? null;
}

function parseOneOnOneTracking(line: string): FlagDetailItemDTO[] | null {
  const match = line.match(/after (\d+) days/);
  const days = match?.[1];
  if (days === undefined) return null;
  return [{ label: 'Days without 1:1', value: days }];
}

function parseWdVsSfrCrossmatch(line: string): FlagDetailItemDTO[] | null {
  const wd = line.match(/WD Profile:\s*'([^']*)'/);
  const sfr = line.match(/SFR Profile:\s*'([^']*)'/);
  const wdValue = wd?.[1];
  const sfrValue = sfr?.[1];
  if (wdValue === undefined && sfrValue === undefined) return null;
  const items: FlagDetailItemDTO[] = [];
  if (wdValue !== undefined) items.push({ label: 'WD Profile', value: wdValue });
  if (sfrValue !== undefined) items.push({ label: 'SFR Profile', value: sfrValue });
  return items;
}

function parseTeamcardsVsSfrCrossmatch(line: string): FlagDetailItemDTO[] | null {
  const rest = stripCommonPrefix(line);
  if (!rest) return null;
  const pairs = rest.split(';').map((p) => p.trim()).filter(Boolean);
  const items: FlagDetailItemDTO[] = [];
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) return null;
    items.push({
      label: pair.slice(0, colonIndex).trim(),
      value: pair.slice(colonIndex + 1).trim(),
    });
  }
  return items.length > 0 ? items : null;
}

const CATEGORY_PARSERS: Record<string, (line: string) => FlagDetailItemDTO[] | null> = {
  '1o1 Tracking': parseOneOnOneTracking,
  'WD vs SFR Crossmatch': parseWdVsSfrCrossmatch,
  'Teamcards vs SFR Crossmatch': parseTeamcardsVsSfrCrossmatch,
};

/**
 * Deterministic, per-category extraction of the meaningful facts from a flag's
 * description. Returns `null` when nothing recognizable can be extracted —
 * callers should fall back to the AI parser in that case.
 */
export function parseFlagDetail(category: string, description: string): FlagDetailItemDTO[] | null {
  const line = secondDescriptionLine(description);
  if (!line) return null;

  const specific = CATEGORY_PARSERS[category]?.(line);
  if (specific) return specific;

  const rest = stripCommonPrefix(line);
  if (rest) return [{ label: 'Detail', value: rest }];

  return null;
}
