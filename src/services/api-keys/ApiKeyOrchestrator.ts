import { Prisma } from '@prisma/client';
import { listApiKeys } from './components/ListApiKeys';
import { issueApiKey } from './components/IssueApiKey';
import { revokeApiKey } from './components/RevokeApiKey';
import { deleteApiKey } from './components/DeleteApiKey';
import { getAllPermissionCatalog } from './components/GetPermissionCatalog';
import { createPermissionCatalogEntry } from './components/CreatePermissionCatalogEntry';
import { updatePermissionCatalogEntry } from './components/UpdatePermissionCatalogEntry';
import { deletePermissionCatalogEntry } from './components/DeletePermissionCatalogEntry';
import { DuplicatePermissionCatalogEntryError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  IssueApiKeyDTO,
  IssueApiKeyResponseDTO,
  ApiKeyDTO,
  ApiPermissionCatalogDTO,
  CreatePermissionCatalogEntryDTO,
  UpdatePermissionCatalogEntryDTO,
} from '@shared/dto';

const API_KEY_TABLE = 'ds.apk_api_keys';
const PERMISSION_CATALOG_TABLE = 'ds.apc_api_permission_catalog';

function isPrismaKnownError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

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

async function orchestrateCreatePermissionCatalogEntry(
  input: CreatePermissionCatalogEntryDTO,
  createdBy: number,
  createdByEmail: string,
): Promise<ApiPermissionCatalogDTO> {
  try {
    const created = await createPermissionCatalogEntry(input, createdBy);
    await auditOrchestrator.log({
      entityName: PERMISSION_CATALOG_TABLE,
      entityId: String(created.apcId),
      createdBy: createdByEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Permission catalog entry created: ${input.apcResource}.${input.apcAction}`,
    });
    return created;
  } catch (err: unknown) {
    if (isPrismaKnownError(err, 'P2002')) {
      throw new DuplicatePermissionCatalogEntryError(input.apcResource, input.apcAction);
    }
    throw err;
  }
}

async function orchestrateUpdatePermissionCatalogEntry(
  apcId: number,
  input: UpdatePermissionCatalogEntryDTO,
  updatedByEmail: string,
): Promise<ApiPermissionCatalogDTO> {
  const { before, after } = await updatePermissionCatalogEntry(apcId, input);
  await auditOrchestrator.log({
    entityName: PERMISSION_CATALOG_TABLE,
    entityId: String(apcId),
    createdBy: updatedByEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: after as unknown as Record<string, unknown>,
    comment: `Permission catalog entry updated: ${after.apcResource}.${after.apcAction}`,
  });
  return after;
}

async function orchestrateDeletePermissionCatalogEntry(
  apcId: number,
  deletedByEmail: string,
): Promise<void> {
  const { before, after } = await deletePermissionCatalogEntry(apcId);
  await auditOrchestrator.log({
    entityName: PERMISSION_CATALOG_TABLE,
    entityId: String(apcId),
    createdBy: deletedByEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: after as unknown as Record<string, unknown>,
    comment: `Permission catalog entry deactivated: ${after.apcResource}.${after.apcAction}`,
  });
}

export const apiKeyOrchestrator = {
  listKeys: listApiKeys,
  issueKey: orchestrateIssueKey,
  revokeKey: orchestrateRevokeKey,
  deleteKey: orchestrateDeleteKey,
  getPermissionCatalog: getAllPermissionCatalog,
  createPermissionCatalogEntry: orchestrateCreatePermissionCatalogEntry,
  updatePermissionCatalogEntry: orchestrateUpdatePermissionCatalogEntry,
  deletePermissionCatalogEntry: orchestrateDeletePermissionCatalogEntry,
};
