import { callMondayApi } from '../lib/mondayClient';
import type { MondayBoardColumnDTO } from '@shared/dto';

interface ColumnsQueryResult {
  boards: Array<{
    columns: Array<{ id: string; title: string; type: string; settings_str: string }>;
  }>;
}

const COLUMNS_QUERY = `
  query ($boardIds: [ID!]) {
    boards (ids: $boardIds) {
      columns { id title type settings_str }
    }
  }
`;

function parseColumnOptions(columnType: string, settingsStr: string): string[] | undefined {
  if (!settingsStr) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsStr);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;
  const labels = (parsed as Record<string, unknown>).labels;

  if (columnType === 'status' && labels && typeof labels === 'object' && !Array.isArray(labels)) {
    return Object.values(labels as Record<string, unknown>).map(String);
  }
  if (columnType === 'dropdown' && Array.isArray(labels)) {
    return labels.map((l) => (typeof l === 'object' && l !== null && 'name' in l ? String((l as { name: unknown }).name) : String(l)));
  }
  return undefined;
}

export async function listMondayBoardColumns(
  apiKey: string,
  boardId: string,
): Promise<MondayBoardColumnDTO[]> {
  const result = await callMondayApi<ColumnsQueryResult>(apiKey.trim(), COLUMNS_QUERY, {
    boardIds: [boardId],
  });
  const board = result.boards[0];
  if (!board) return [];

  return board.columns.map((c) => {
    const options = parseColumnOptions(c.type, c.settings_str);
    return {
      columnId: c.id,
      columnTitle: c.title,
      columnType: c.type,
      ...(options !== undefined ? { options } : {}),
    };
  });
}
