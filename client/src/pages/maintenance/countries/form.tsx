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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface CountryFormData {
  countryName: string;
  regionId: string;
  countryIso: string;
  currencySymbol: string;
  nightStart: string;
  nightEnd: string;
  nightMultiplier: string;
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
      nightStart: '',
      nightEnd: '',
      nightMultiplier: '',
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
          nightStart: country.nightStart?.toString() || '',
          nightEnd: country.nightEnd?.toString() || '',
          nightMultiplier: country.nightMultiplier?.toString() || '',
        });
      } else {
        reset({
          countryName: '',
          regionId: '',
          countryIso: '',
          currencySymbol: '',
          nightStart: '',
          nightEnd: '',
          nightMultiplier: '',
        });
      }
    }
  }, [open, country, reset]);

  const onSubmit = async (data: CountryFormData) => {
    try {
      const nightStart = data.nightStart !== '' ? Number(data.nightStart) : null;
      const nightEnd = data.nightEnd !== '' ? Number(data.nightEnd) : null;
      const nightMultiplier = data.nightMultiplier !== '' ? Number(data.nightMultiplier) : null;

      if (isEditing) {
        const payload: UpdateCountryDTO = {
          countryName: data.countryName.trim(),
          regionId: data.regionId ? Number(data.regionId) : null,
          countryIso: data.countryIso.trim() || null,
          currencySymbol: data.currencySymbol.trim() || null,
          nightStart,
          nightEnd,
          nightMultiplier,
        };
        await apiPut<CountryDTO, UpdateCountryDTO>(`/api/countries/${country.countryId}`, payload);
        toast({ title: 'Success', description: 'Country updated successfully' });
      } else {
        const payload: CreateCountryDTO = {
          countryName: data.countryName.trim(),
          regionId: data.regionId ? Number(data.regionId) : null,
          countryIso: data.countryIso.trim() || null,
          currencySymbol: data.currencySymbol.trim() || null,
          nightStart,
          nightEnd,
          nightMultiplier,
        };
        await apiPost<CountryDTO, CreateCountryDTO>('/api/countries', payload);
        toast({ title: 'Success', description: 'Country created successfully' });
      }

      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Error',
        description: message || `Failed to ${isEditing ? 'update' : 'create'} country`,
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

            {/* Night shift fields - single row */}
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="nightStart">Night Start (h)</Label>
                <Input
                  id="nightStart"
                  type="number"
                  placeholder="e.g., 18"
                  {...register('nightStart', {
                    required: 'Night Start is required',
                    validate: (val) => {
                      if (val === '' || val === undefined) return 'Night Start is required';
                      const n = Number(val);
                      if (!Number.isInteger(n)) return 'Must be an integer';
                      if (n < 0) return 'Must be a positive integer';
                      return true;
                    },
                  })}
                />
                {errors.nightStart && (
                  <p className="text-sm text-destructive">{errors.nightStart.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nightEnd">Night End (h)</Label>
                <Input
                  id="nightEnd"
                  type="number"
                  placeholder="e.g., 6"
                  {...register('nightEnd', {
                    required: 'Night End is required',
                    validate: (val) => {
                      if (val === '' || val === undefined) return 'Night End is required';
                      const n = Number(val);
                      if (!Number.isInteger(n)) return 'Must be an integer';
                      if (n <= 0) return 'Must be a positive integer';
                      return true;
                    },
                  })}
                />
                {errors.nightEnd && (
                  <p className="text-sm text-destructive">{errors.nightEnd.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="nightMultiplier" className="cursor-help w-fit">
                      Night Hour multiplier
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>Compensatory Night Hours multiplier</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                <Input
                  id="nightMultiplier"
                  type="number"
                  step="0.25"
                  placeholder="e.g., 1.25"
                  {...register('nightMultiplier', {
                    required: 'Night multiplier is required',
                    validate: (val) => {
                      if (val === '' || val === undefined) return 'Night multiplier is required';
                      const n = Number(val);
                      if (isNaN(n)) return 'Must be a number';
                      if (n < 1) return 'Must be 1 or greater';
                      return true;
                    },
                  })}
                />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Compensatory Night Hours multiplier</TooltipContent>
                </Tooltip>
                {errors.nightMultiplier && (
                  <p className="text-sm text-destructive">{errors.nightMultiplier.message}</p>
                )}
              </div>
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
