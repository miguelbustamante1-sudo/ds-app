import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ClientDTO, CreateClientDTO, UpdateClientDTO } from '@shared/dto';
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
import { apiPost, apiPut } from '@/lib/api';

interface ClientFormData {
  Name: string;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientDTO;
  onSuccess: () => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: {
      Name: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        reset({ Name: client.Name });
      } else {
        reset({ Name: '' });
      }
    }
  }, [open, client, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateClientDTO = { Name: data.Name.trim() };
        await apiPut<ClientDTO, UpdateClientDTO>(`/api/clients/${client.Id}`, payload);
        toast({ title: 'Success', description: 'Client updated successfully' });
      } else {
        const payload: CreateClientDTO = { Name: data.Name.trim() };
        await apiPost<ClientDTO, CreateClientDTO>('/api/clients', payload);
        toast({ title: 'Success', description: 'Client created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} client`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'New Client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the client information below.'
              : 'Fill in the details to create a new client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="Name">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="Name"
                placeholder="e.g., Acme Corporation"
                {...register('Name', {
                  required: 'Client name is required',
                  minLength: {
                    value: 2,
                    message: 'Client name must be at least 2 characters',
                  },
                })}
              />
              {errors.Name && (
                <p className="text-sm text-destructive">{errors.Name.message}</p>
              )}
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
