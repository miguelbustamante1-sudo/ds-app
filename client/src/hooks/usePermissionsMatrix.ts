import { useState, useEffect } from 'react';
import {
  getRoles,
  getOptions,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from '@/services/security';
import type { SecurityRoleDTO, OptionDTO, PermissionDTO } from '@shared/dto';
import { useToast } from '@/hooks/use-toast';

export interface MatrixRow {
  option: OptionDTO;
  permission: PermissionDTO | null;
  read: boolean;
  write: boolean;
  del: boolean;
}

export function usePermissionsMatrix() {
  const [roles, setRoles] = useState<SecurityRoleDTO[]>([]);
  const [options, setOptions] = useState<OptionDTO[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOptionId, setSavingOptionId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([getRoles(), getOptions()]).then(([r, o]) => {
      setRoles(r);
      setOptions(o);
    });
  }, []);

  useEffect(() => {
    if (selectedRoleId === null) {
      setMatrix([]);
      return;
    }
    setLoading(true);
    getPermissions()
      .then((allPerms) => {
        const forRole = allPerms.filter((p) => p.roleId === selectedRoleId);
        const rows: MatrixRow[] = options.map((opt) => {
          const perm = forRole.find((p) => p.optionId === opt.optionId) ?? null;
          return {
            option: opt,
            permission: perm,
            read: perm?.permissionRead ?? false,
            write: perm?.permissionWrite ?? false,
            del: perm?.permissionDelete ?? false,
          };
        });
        setMatrix(rows);
      })
      .finally(() => setLoading(false));
  }, [selectedRoleId, options]);

  async function toggleFlag(optionId: number, flag: 'read' | 'write' | 'del') {
    if (!selectedRoleId || savingOptionId !== null) return;

    const row = matrix.find((r) => r.option.optionId === optionId);
    if (!row) return;

    const optimistic: MatrixRow = { ...row, [flag]: !row[flag] };
    setMatrix((prev) => prev.map((r) => r.option.optionId === optionId ? optimistic : r));
    setSavingOptionId(optionId);

    try {
      const allFalse = !optimistic.read && !optimistic.write && !optimistic.del;

      if (row.permission && allFalse) {
        await deletePermission(row.permission.permissionId);
        setMatrix((prev) =>
          prev.map((r) => r.option.optionId === optionId ? { ...optimistic, permission: null } : r),
        );
      } else if (row.permission && !allFalse) {
        await updatePermission(row.permission.permissionId, {
          per_read: optimistic.read,
          per_write: optimistic.write,
          per_delete: optimistic.del,
        });
      } else if (!row.permission && !allFalse) {
        const created = await createPermission({
          per_read: optimistic.read,
          per_write: optimistic.write,
          per_delete: optimistic.del,
          opt_id: optionId,
          rol_id: selectedRoleId,
          per_resource: row.option.optionDescription,
        });
        setMatrix((prev) =>
          prev.map((r) => r.option.optionId === optionId ? { ...optimistic, permission: created } : r),
        );
      }
    } catch {
      setMatrix((prev) => prev.map((r) => r.option.optionId === optionId ? row : r));
      toast({ title: 'Error', description: 'Failed to update permission.', variant: 'destructive' });
    } finally {
      setSavingOptionId(null);
    }
  }

  return {
    roles,
    options,
    selectedRoleId,
    setSelectedRoleId,
    matrix,
    loading,
    savingOptionId,
    toggleFlag,
  };
}
