import { getRbacPermissionsByUserId } from '../db/rbacAccess';
import type {
  PermissionAction,
  PermissionFlags,
  PermissionMap,
  PermissionSource,
  PermissionContext,
} from '../../shared/types/permissions';

// Re-export shared types for backward compatibility
export type {
  PermissionAction,
  PermissionFlags,
  PermissionMap,
  PermissionSource,
  PermissionContext,
};

const emptyFlags = (): PermissionFlags => ({ read: false, create: false, delete: false });

const mergeFlags = (target: PermissionFlags, incoming: PermissionFlags): PermissionFlags => ({
  read: target.read || incoming.read,
  create: target.create || incoming.create,
  delete: target.delete || incoming.delete,
});

const normalizeJwtPermissions = (payload?: unknown): PermissionMap => {
  if (!payload || typeof payload !== 'object') return {};
  const raw = (payload as Record<string, unknown>).permissions;
  if (!raw || typeof raw !== 'object') return {};

  const map: PermissionMap = {};
  for (const [resource, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const flags = value as Record<string, unknown>;
    map[resource] = {
      read: Boolean(flags.read),
      create: Boolean(flags.create),
      delete: Boolean(flags.delete),
    };
  }

  return map;
};

export async function resolvePermissions(
  source: PermissionSource,
  context: PermissionContext
): Promise<PermissionMap> {
  if (source === 'jwt') {
    return normalizeJwtPermissions(context.tokenPayload);
  }

  if (!context.userId) {
    return {};
  }

  const rows = await getRbacPermissionsByUserId(context.userId);
  const map: PermissionMap = {};

  for (const row of rows) {
    const current = map[row.permissionResource] ?? emptyFlags();
    const incoming: PermissionFlags = {
      read: row.permissionRead,
      create: row.permissionWrite,
      delete: row.permissionDelete,
    };

    map[row.permissionResource] = mergeFlags(current, incoming);
  }

  return map;
}

export const can = (permissions: PermissionMap, resource: string, action: PermissionAction): boolean =>
  Boolean(permissions[resource]?.[action]);
