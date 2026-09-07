import { useEffect, useState } from 'react';
import type { AuthUserWithRolesDTO, SecurityRoleDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { assignRoleToUser, removeRoleFromUser } from '@/services/security';

interface ManageUserRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUserWithRolesDTO | null;
  allRoles: SecurityRoleDTO[];
  onSuccess: (updatedUser: AuthUserWithRolesDTO) => void;
}

export function ManageUserRolesDialog({
  open,
  onOpenChange,
  user,
  allRoles,
  onSuccess,
}: ManageUserRolesDialogProps) {
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<number>>(new Set());
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      setAssignedRoleIds(new Set(user.assignedRoles.map((r) => r.roleId)));
    }
  }, [open, user]);

  const handleToggle = async (role: SecurityRoleDTO, isAssigned: boolean) => {
    if (!user || savingRoleId !== null) return;

    setSavingRoleId(role.roleId);
    try {
      if (isAssigned) {
        await removeRoleFromUser(user.id, role.roleId);
        const next = new Set(assignedRoleIds);
        next.delete(role.roleId);
        setAssignedRoleIds(next);
        onSuccess({
          ...user,
          assignedRoles: user.assignedRoles.filter((r) => r.roleId !== role.roleId),
        });
        toast({ title: 'Role removed', description: `${role.roleName} removed from ${user.email}` });
      } else {
        await assignRoleToUser(user.id, role.roleId);
        const next = new Set(assignedRoleIds);
        next.add(role.roleId);
        setAssignedRoleIds(next);
        onSuccess({
          ...user,
          assignedRoles: [...user.assignedRoles, role],
        });
        toast({ title: 'Role assigned', description: `${role.roleName} assigned to ${user.email}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSavingRoleId(null);
    }
  };

  if (!user) return null;

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles — {displayName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {allRoles.length === 0 && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {allRoles.map((role) => {
            const isAssigned = assignedRoleIds.has(role.roleId);
            const isSaving = savingRoleId === role.roleId;
            return (
              <div
                key={role.roleId}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor={`role-${role.roleId}`} className="font-medium">
                    {role.roleName}
                  </Label>
                  {role.roleDescription && (
                    <span className="text-xs text-muted-foreground">{role.roleDescription}</span>
                  )}
                </div>
                <Switch
                  id={`role-${role.roleId}`}
                  checked={isAssigned}
                  disabled={isSaving || savingRoleId !== null}
                  onCheckedChange={() => handleToggle(role, isAssigned)}
                />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
