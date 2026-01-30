import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { CountryDTO, CreateCountryDTO, UpdateCountryDTO } from '@shared/dto';
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

interface CountryFormData {
  countryName: string;
  regionId: string;
  countryIso: string;
}

interface CountryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: CountryDTO;
  onSuccess: () => void;
}

export function CountryFormDialog({
  open,
  onOpenChange,
  country,
  onSuccess,
}: CountryFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!country;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CountryFormData>({
    defaultValues: {
      countryName: '',
      regionId: '',
      countryIso: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (country) {
        reset({
          countryName: country.countryName,
          regionId: country.regionId?.toString() || '',
          countryIso: country.countryIso || '',
        });
      } else {
        reset({
          countryName: '',
          regionId: '',
          countryIso: '',
        });
      }
    }
  }, [open, country, reset]);

  const onSubmit = async (data: CountryFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateCountryDTO = {
          countryName: data.countryName.trim(),
          regionId: data.regionId ? Number(data.regionId) : null,
          countryIso: data.countryIso.trim() || null,
        };
        await apiPut<CountryDTO, UpdateCountryDTO>(`/api/countries/${country.countryId}`, payload);
        toast({
          title: 'Success',
          description: 'Country updated successfully',
        });
      } else {
        const payload: CreateCountryDTO = {
          countryName: data.countryName.trim(),
          regionId: data.regionId ? Number(data.regionId) : null,
          countryIso: data.countryIso.trim() || null,
        };
        await apiPost<CountryDTO, CreateCountryDTO>('/api/countries', payload);
        toast({
          title: 'Success',
          description: 'Country created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} country`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Country' : 'New Country'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the country information below.'
              : 'Fill in the details to create a new country.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="countryName">
                Country Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="countryName"
                placeholder="e.g., United States"
                {...register('countryName', {
                  required: 'Country name is required',
                  minLength: {
                    value: 2,
                    message: 'Country name must be at least 2 characters',
                  },
                })}
              />
              {errors.countryName && (
                <p className="text-sm text-destructive">{errors.countryName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionId">Region ID</Label>
              <Input
                id="regionId"
                type="number"
                placeholder="Optional"
                {...register('regionId', {
                  pattern: {
                    value: /^\d+$/,
                    message: 'Region ID must be a number',
                  },
                })}
              />
              {errors.regionId && (
                <p className="text-sm text-destructive">{errors.regionId.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Leave empty if the country is not associated with a region
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryIso">ISO Code</Label>
              <Input
                id="countryIso"
                placeholder="e.g., US"
                maxLength={2}
                {...register('countryIso', {
                  maxLength: {
                    value: 2,
                    message: 'ISO code must be 2 characters',
                  },
                })}
              />
              {errors.countryIso && (
                <p className="text-sm text-destructive">{errors.countryIso.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Optional 2-letter ISO country code
              </p>
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
