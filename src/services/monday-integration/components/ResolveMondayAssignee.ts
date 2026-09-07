import { callMondayApi } from '../lib/mondayClient';

interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
}

async function fetchMondayUserEmail(apiKey: string, mondayUserId: string): Promise<string | null> {
  const result = await callMondayApi<{ users: Array<{ email: string }> }>(
    apiKey,
    `query ($ids: [ID!]) { users (ids: $ids) { email } }`,
    { ids: [mondayUserId] },
  );
  return result.users[0]?.email ?? null;
}

export async function resolveAssigneeEmail(
  apiKey: string,
  columnValue: MondayColumnValue | undefined,
): Promise<string | null> {
  if (!columnValue?.value) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(columnValue.value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.email === 'string' && obj.email) return obj.email;

  const personsAndTeams = obj.personsAndTeams;
  if (Array.isArray(personsAndTeams)) {
    const firstPerson = personsAndTeams.find(
      (p) => typeof p === 'object' && p !== null && (p as Record<string, unknown>).kind === 'person',
    );
    const personId = firstPerson ? (firstPerson as Record<string, unknown>).id : undefined;
    if (typeof personId === 'number' || typeof personId === 'string') {
      return fetchMondayUserEmail(apiKey, String(personId));
    }
  }

  return null;
}
