import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { ClientContactDTO, ClientDTO, CreateClientContactDTO, UpdateClientContactDTO } from '@shared/dto';
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
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface ClientContactFormData {
  clientId: string;
  name: string;
  email: string;
  phoneNumber: string;
  position: string;
  active: boolean;
}

interface ClientContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ClientContactDTO;
  onSuccess: () => void;
}

export function ClientContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ClientContactFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!contact;

  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ClientContactFormData>({
    defaultValues: {
      clientId: '',
      name: '',
      email: '',
      phoneNumber: '',
      position: '',
      active: true,
    },
  });

  const watchedClientId = watch('clientId');

  const clientOptions: ComboBoxOption[] = clients.map((c) => ({
    value: c.Id.toString(),
    label: c.Name,
  }));

  useEffect(() => {
    if (open) {
      setLoadingClients(true);
      apiGet<ClientDTO[]>('/api/clients')
        .then((data) => setClients(data))
        .catch(() =>
          toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' }),
        )
        .finally(() => setLoadingClients(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          clientId: contact.clientId.toString(),
          name: contact.name,
          email: contact.email,
          phoneNumber: contact.phoneNumber,
          position: contact.position ?? '',
          active: contact.active,
        });
      } else {
        reset({
          clientId: '',
          name: '',
          email: '',
          phoneNumber: '',
          position: '',
          active: true,
        });
      }
    }
  }, [open, contact, reset]);

  const onSubmit = async (data: ClientContactFormData) => {
    if (!data.clientId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a client',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing) {
        const payload: UpdateClientContactDTO = {
          name: data.name.trim(),
          email: data.email.trim(),
          phoneNumber: data.phoneNumber.trim(),
          position: data.position.trim() || null,
          active: data.active,
        };
        await apiPut<ClientContactDTO, UpdateClientContactDTO>(
          `/api/client-contacts/${contact.id}`,
          payload,
        );
        toast({ title: 'Success', description: 'Contact updated successfully' });
      } else {
        const payload: CreateClientContactDTO = {
          clientId: Number(data.clientId),
          name: data.name.trim(),
          email: data.email.trim(),
          phoneNumber: data.phoneNumber.trim(),
          position: data.position.trim() || null,
        };
        await apiPost<ClientContactDTO, CreateClientContactDTO>('/api/client-contacts', payload);
        toast({ title: 'Success', description: 'Contact created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} contact`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the contact information below.'
              : 'Fill in the details to create a new client contact.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">
                Client <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={clientOptions}
                value={watchedClientId}
                onValueChange={(value) => setValue('clientId', value)}
                placeholder="Select a client..."
                searchPlaceholder="Search clients..."
                emptyMessage="No clients found."
                disabled={loadingClients || isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Jane Doe"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., jane.doe@acme.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                placeholder="e.g., +1 555 000 0000"
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                })}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                placeholder="e.g., VP of Engineering"
                {...register('position')}
              />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}
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
