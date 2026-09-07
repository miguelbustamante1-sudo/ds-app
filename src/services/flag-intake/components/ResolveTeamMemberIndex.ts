/**
 * "Eager search" for the TI Supervisor column: the source export gives a
 * plain full name, not a Workday ID, so there's nothing to look up by exact
 * key. Instead of running a query per row, the full team member roster is
 * fetched once (eagerly) and indexed in memory, then every row's supervisor
 * name is matched against that index.
 *
 * Names in the export are often abbreviated to "first given name + first
 * surname" (e.g. "Byron Cardona" for someone whose DB record is
 * teamMemberNames="Byron Fernando", teamMemberSurnames="Cardona Sanchez").
 * To handle that without assuming a fixed token count, each team member is
 * indexed under a small set of plausible short-form variants; a row matches
 * only when its normalized name maps to exactly one team member across all
 * variants — anything else (no match, or more than one distinct person) is
 * left for the caller to treat as a failed row.
 */

import type { TeamMember } from '@prisma/client';

export interface TeamMemberIndex {
  byNormalizedName: Map<string, Set<number>>;
}

const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g');

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function firstToken(normalized: string): string {
  return normalized.split(' ')[0] ?? normalized;
}

function candidateKeys(namesField: string, surnamesField: string): string[] {
  const names = normalizeName(namesField);
  const surnames = normalizeName(surnamesField);
  const namesFirst = firstToken(names);
  const surnamesFirst = firstToken(surnames);

  return Array.from(
    new Set([
      `${names} ${surnames}`,
      `${namesFirst} ${surnamesFirst}`,
      `${namesFirst} ${surnames}`,
      `${names} ${surnamesFirst}`,
    ]),
  );
}

export function buildTeamMemberIndex(members: TeamMember[]): TeamMemberIndex {
  const byNormalizedName = new Map<string, Set<number>>();

  for (const member of members) {
    for (const key of candidateKeys(member.teamMemberNames, member.teamMemberSurnames)) {
      const existing = byNormalizedName.get(key);
      if (existing) existing.add(member.teamMemberId);
      else byNormalizedName.set(key, new Set([member.teamMemberId]));
    }
  }

  return { byNormalizedName };
}

/** Returns the matched teamMemberId, or null if there's no match or more than one distinct match. */
export function resolveTeamMemberIdByName(index: TeamMemberIndex, rawName: string): number | null {
  const matches = index.byNormalizedName.get(normalizeName(rawName));
  if (!matches || matches.size !== 1) return null;
  return matches.values().next().value ?? null;
}
