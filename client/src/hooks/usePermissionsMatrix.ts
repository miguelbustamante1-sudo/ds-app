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
  permission: PermissionDTO | null; // null when no permission record exists for this role+option
  read: boolean;
  write: boolean;
  del: boolean;   // 'delete' is a reserved word
  dirty: boolean; // true when user toggled a checkbox since last load/save
}

export function usePermissionsMatrix() {
  const [roles, setRoles] = useState<SecurityRoleDTO[]>([]);
  const [options, setOptions] = useState<OptionDTO[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 1. On mount — fetch roles and options once (they rarely change)
  useEffect(() => {
    Promise.all([getRoles(), getOptions()]).then(([r, o]) => {
      setRoles(r);
      setOptions(o);
    });
  }, []);

  // 2. When selectedRoleId changes — fetch ALL permissions, filter in memory
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
            dirty: false,
          };
        });
        setMatrix(rows);
      })
      .finally(() => setLoading(false));
  }, [selectedRoleId, options]);

  // 3. toggleFlag — marks the row dirty
  function toggleFlag(optionId: number, flag: 'read' | 'write' | 'del') {
    setMatrix((prev) =>
      prev.map((row) => {
        if (row.option.optionId !== optionId) return row;
        return { ...row, [flag]: !row[flag], dirty: true };
      }),
    );
  }

  // 4. saveChanges — runs all mutations in parallel, then reloads
  async function saveChanges() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const ops = matrix
        .filter((r) => r.dirty)
        .map((row) => {
          const allFalse = !row.read && !row.write && !row.del;
          if (row.permission && allFalse) {
            // DELETE
            return deletePermission(row.permission.permissionId);
          }
          if (row.permission && !allFalse) {
            // UPDATE
            return updatePermission(row.permission.permissionId, {
              per_read: row.read,
              per_write: row.write,
              per_delete: row.del,
            });
          }
          if (!row.permission && !allFalse) {
            // CREATE
            return createPermission({
              per_read: row.read,
              per_write: row.write,
              per_delete: row.del,
              opt_id: row.option.optionId,
              rol_id: selectedRoleId,
              per_resource: row.option.optionDescription,
            });
          }
          return Promise.resolve(); // no-op (dirty but all false and no existing permission)
        });
      await Promise.all(ops);
      toast({ title: 'Success', description: 'Permissions saved.' });
      // Reload matrix after save by toggling selectedRoleId
      const saved = selectedRoleId;
      setSelectedRoleId(null);
      setTimeout(() => setSelectedRoleId(saved), 0);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save some permissions.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const hasDirty = matrix.some((r) => r.dirty);

  return {
    roles,
    options,
    selectedRoleId,
    setSelectedRoleId,
    matrix,
    loading,
    saving,
    toggleFlag,
    saveChanges,
    hasDirty,
  };
}
