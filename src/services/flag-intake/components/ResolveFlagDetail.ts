import type { FlagDetailItemDTO } from '@shared/dto';
import { parseFlagDetail } from './ParseFlagDetail';
import { parseFlagDetailWithAi } from './ParseFlagDetailWithAi';

export async function resolveFlagDetail(
  category: string,
  description: string | null,
): Promise<FlagDetailItemDTO[] | null> {
  if (!description) return null;

  const parsed = parseFlagDetail(category, description);
  if (parsed) return parsed;

  const lines = description.split('\n');
  const line = (lines.length >= 2 ? lines[1] : lines[0]) ?? description;
  return parseFlagDetailWithAi(category, line);
}
