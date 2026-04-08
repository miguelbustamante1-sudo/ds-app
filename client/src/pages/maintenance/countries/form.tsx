import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { CountryDTO, CreateCountryDTO, UpdateCountryDTO, RegionDTO } from '@shared/dto';
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
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface CountryFormData {
  countryName: string;
  regionId: string;
  countryIso: string;
  currencySymbol: string;
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
  const [regions, setRegions] = useState<RegionDTO[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CountryFormData>({
    defaultValues: {
      countryName: '',
      regionId: '',
      countryIso: '',
      currencySymbol: '',
    },
  });

  useEffect(() => {
    if (open) {
      setLoadingRegions(true);
      apiGet<RegionDTO[]>('/api/regions')
        .then((data) => setRegions(data))
        .catch(() =>
          toast({ title: 'Error', description: 'Failed to load regions', variant: 'destructive' })
        )
        .finally(() => setLoadingRegions(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (country) {
        reset({
          countryName: country.countryName,
          regionId: country.regionId?.toString() || '',
          countryIso: country.countryIso || '',
          currencySymbol: country.currencySymbol || '',
        });
      } else {
        reset({
          countryName: '',
          regionId: '',
          countryIso: '',
          currencySymbol: '',
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
          currencySymbol: data.currencySymbol.trim() || null,
        };
        await apiPut<CountryDTO, UpdateCountryDTO>(`/api/countries/${country.countryId}`, payload);
        toast({ title: 'Success', description: 'Country updated successfully' });
      } else {
        const payload: CreateCountryDTO = {
          countryName: data.countryName.trim(),
          regionId: data.regionId ? Number(data.regionId) : null,
          countryIso: data.countryIso.trim() || null,
          currencySymbol: data.currencySymbol.trim() || null,
        };
        await apiPost<CountryDTO, CreateCountryDTO>('/api/countries', payload);
        toast({ title: 'Success', description: 'Country created successfully' });
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

  const regionOptions: ComboBoxOption[] = regions.map((r) => ({
    value: r.regionId.toString(),
    label: r.regionName,
  }));

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
              <Label>Region</Label>
              <Controller
                name="regionId"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    options={regionOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingRegions ? 'Loading...' : 'Select a region (optional)'}
                    searchPlaceholder="Search regions..."
                    emptyMessage="No regions found."
                    disabled={loadingRegions}
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">
                Select a region or click the selected item again to clear
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
              <p className="text-sm text-muted-foreground">Optional 2-letter ISO country code</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input
                id="currencySymbol"
                placeholder="e.g., $"
                maxLength={10}
                {...register('currencySymbol', {
                  maxLength: {
                    value: 10,
                    message: 'Currency symbol must be 10 characters or fewer',
                  },
                })}
              />
              {errors.currencySymbol && (
                <p className="text-sm text-destructive">{errors.currencySymbol.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Optional currency symbol (e.g., $, €, £)
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
            <Button type="submit" disabled={isSubmitting || loadingRegions}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
