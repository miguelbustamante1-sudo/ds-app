import { listApiKeys } from './components/ListApiKeys';
import { issueApiKey } from './components/IssueApiKey';
import { revokeApiKey } from './components/RevokeApiKey';
import { deleteApiKey } from './components/DeleteApiKey';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type { IssueApiKeyDTO, IssueApiKeyResponseDTO, ApiKeyDTO } from '@shared/dto';

const API_KEY_TABLE = 'ds.apk_api_keys';

async function orchestrateIssueKey(
  input: IssueApiKeyDTO,
  createdBy: number,
  createdByEmail: string,
): Promise<IssueApiKeyResponseDTO> {
  const result = await issueApiKey(input, createdBy);
  const snapshot = await listApiKeys().then((keys) => keys.find((k) => k.apkId === result.apkId) ?? null);
  await auditOrchestrator.log({
    entityName: API_KEY_TABLE,
    entityId: String(result.apkId),
    createdBy: createdByEmail,
    oldValues: null,
    newValues: snapshot as unknown as Record<string, unknown>,
    comment: `API key issued: ${result.apkName}`,
  });
  return result;
}

async function orchestrateRevokeKey(
  apkId: number,
  updatedByEmail: string,
): Promise<ApiKeyDTO> {
  const { before, after } = await revokeApiKey(apkId);
  await auditOrchestrator.log({
    entityName: API_KEY_TABLE,
    entityId: String(apkId),
    createdBy: updatedByEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: after as unknown as Record<string, unknown>,
    comment: `API key revoked: ${after.apkName}`,
  });
  return after;
}

async function orchestrateDeleteKey(
  apkId: number,
  deletedByEmail: string,
): Promise<void> {
  const deleted = await deleteApiKey(apkId);
  await auditOrchestrator.log({
    entityName: API_KEY_TABLE,
    entityId: String(apkId),
    createdBy: deletedByEmail,
    oldValues: deleted as unknown as Record<string, unknown>,
    newValues: null,
    comment: `API key deleted: ${deleted.apkName}`,
  });
}

export const apiKeyOrchestrator = {
  listKeys: listApiKeys,
  issueKey: orchestrateIssueKey,
  revokeKey: orchestrateRevokeKey,
  deleteKey: orchestrateDeleteKey,
};
