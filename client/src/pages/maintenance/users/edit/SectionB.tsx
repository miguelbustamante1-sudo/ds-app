import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AuthUserDetailDTO, SecurityRoleDTO } from '@shared/dto';
import {
  updateAuthUserInlineRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from '@/services/security';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { Shield } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';

interface Props {
  authUser: AuthUserDetailDTO;
  availableRoles: SecurityRoleDTO[];
  onSaved: (updated: AuthUserDetailDTO) => void;
}

export function SectionB({ authUser, availableRoles, onSaved }: Props) {
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const [savingInlineRoles, setSavingInlineRoles] = useState(false);
  const [savingRbacRole, setSavingRbacRole] = useState(false);

  const inlineRolesForm = useForm<{ inlineRoles: string }>({
    defaultValues: { inlineRoles: authUser.inlineRoles.join(', ') },
  });

  const rbacRoleForm = useForm<{ rbacRoleId: string }>({
    defaultValues: { rbacRoleId: authUser.rbacRole?.roleId.toString() ?? '' },
  });

  const rbacRoleIdValue = rbacRoleForm.watch('rbacRoleId');

  const handleSaveInlineRoles = inlineRolesForm.handleSubmit(async (data) => {
    setSavingInlineRoles(true);
    try {
      const roles = data.inlineRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      await updateAuthUserInlineRoles(authUser.id, roles);
      toast({ title: 'Success', description: 'Menu roles updated' });
      onSaved({ ...authUser, inlineRoles: roles });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update menu roles';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSavingInlineRoles(false);
    }
  });

  const handleSaveRbacRole = rbacRoleForm.handleSubmit(async (data) => {
    setSavingRbacRole(true);
    try {
      if (authUser.rbacRole) {
        await removeRoleFromUser(authUser.id, authUser.rbacRole.roleId);
      }
      if (data.rbacRoleId) {
        await assignRoleToUser(authUser.id, Number(data.rbacRoleId));
      }
      const selectedRole =
        availableRoles.find((r) => r.roleId.toString() === data.rbacRoleId) ?? null;
      toast({ title: 'Success', description: 'RBAC role updated' });
      onSaved({
        ...authUser,
        rbacRole: selectedRole
          ? {
              roleId: selectedRole.roleId,
              roleName: selectedRole.roleName,
              roleDescription: selectedRole.roleDescription ?? null,
            }
          : null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update RBAC role';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSavingRbacRole(false);
    }
  });

  const roleOptions: ComboBoxOption[] = availableRoles.map((r) => ({
    value: r.roleId.toString(),
    label: r.roleName,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="flex items-center gap-2 mb-6">
          <Shield className="h-4 w-4" />
          Security & Roles
        </CardTitle>

        {/* Read-only auth user identity fields */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">OneLogin ID</p>
            <p className="text-sm font-mono">{authUser.oneloginId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Auth Email</p>
            <p className="text-sm">{authUser.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">First Name</p>
            <p className="text-sm">{authUser.firstName ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Name</p>
            <p className="text-sm">{authUser.lastName ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Login</p>
            <p className="text-sm">
              {authUser.lastLogin ? formatUTCDate(authUser.lastLogin) : '-'}
            </p>
          </div>
        </div>

        {/* Menu Roles — auth_users.roles text array */}
        <div className="mb-6 pb-6 border-b">
          <p className="text-sm font-semibold mb-1">Menu Roles</p>
          <p className="text-xs text-muted-foreground mb-3">
            Controls which sidebar sections are visible. Valid values: <code>user</code>,{' '}
            <code>admin</code>, <code>bsa</code>. Separate multiple values with commas. Do not
            add <code>supervisor</code> here — supervisor status is derived from hierarchy.
          </p>
          <form onSubmit={handleSaveInlineRoles} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="inlineRoles">Roles (comma-separated)</Label>
              <Input
                id="inlineRoles"
                placeholder="e.g., user, admin"
                {...inlineRolesForm.register('inlineRoles')}
              />
            </div>
            {canCreate('RBACUserRoles') && (
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingInlineRoles}>
                  {savingInlineRoles ? 'Saving...' : 'Save Menu Roles'}
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* RBAC Role — uro_user_roles junction table */}
        <div>
          <p className="text-sm font-semibold mb-1">RBAC Role</p>
          <p className="text-xs text-muted-foreground mb-3">
            Controls API permissions and fine-grained feature access via the permission system.
            Takes effect on the user's next login.
          </p>
          <form onSubmit={handleSaveRbacRole} className="space-y-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <ComboBox
                options={roleOptions}
                value={rbacRoleIdValue}
                onValueChange={(value) => rbacRoleForm.setValue('rbacRoleId', value)}
                placeholder="Select a role..."
                searchPlaceholder="Search roles..."
                emptyMessage="No roles found."
              />
            </div>
            {canCreate('RBACUserRoles') && (
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingRbacRole}>
                  {savingRbacRole ? 'Saving...' : 'Save RBAC Role'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
