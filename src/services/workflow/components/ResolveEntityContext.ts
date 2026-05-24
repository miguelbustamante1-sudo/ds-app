import type { WefWorkflowEntityField } from '@prisma/client';

export interface ResolvedContextEntry {
  key: string;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueDatetime: Date | null;
}

export async function resolveEntityContext(
  _entityType: string,
  _businessReferenceId: string,
  _fields: WefWorkflowEntityField[],
): Promise<ResolvedContextEntry[]> {
  // No entity resolvers implemented in v1.
  // New entity types are added by implementing a resolver branch here.
  return [];
}
