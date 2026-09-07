import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SecurityRoleDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createRole, updateRole } from '@/services/security';

interface RoleFormData {
  roleName: string;
  roleDescription: string;
}

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: SecurityRoleDTO;
  onSuccess: () => void;
}

export function RoleFormDialog({ open, onOpenChange, role, onSuccess }: RoleFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!role;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    defaultValues: { roleName: '', roleDescription: '' },
  });

  useEffect(() => {
    if (open) {
      if (role) {
        reset({ roleName: role.roleName, roleDescription: role.roleDescription ?? '' });
      } else {
        reset({ roleName: '', roleDescription: '' });
      }
    }
  }, [open, role, reset]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      if (isEditing) {
        await updateRole(role.roleId, data.roleName.trim(), data.roleDescription?.trim() || null);
        toast({ title: 'Success', description: 'Role updated successfully' });
      } else {
        await createRole(data.roleName.trim(), data.roleDescription?.trim() || null);
        toast({ title: 'Success', description: 'Role created successfully' });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} role`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'New Role'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role information below.'
              : 'Fill in the details to create a new role.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="roleName"
                placeholder="e.g., Admin"
                {...register('roleName', {
                  required: 'Role name is required',
                  minLength: { value: 2, message: 'Role name must be at least 2 characters' },
                })}
              />
              {errors.roleName && (
                <p className="text-sm text-destructive">{errors.roleName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Input
                id="roleDescription"
                placeholder="Optional description"
                {...register('roleDescription')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
