import { callMondayApi } from '../lib/mondayClient';
import type { TestMondayConnectionResponseDTO } from '@shared/dto';

interface MeQueryResult {
  me: { name: string };
}

const ME_QUERY = `query { me { name } }`;

export async function testMondayConnection(apiKey: string): Promise<TestMondayConnectionResponseDTO> {
  try {
    const result = await callMondayApi<MeQueryResult>(apiKey.trim(), ME_QUERY);
    return { success: true, accountName: result.me.name };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error contacting Monday';
    return { success: false, error: message };
  }
}
