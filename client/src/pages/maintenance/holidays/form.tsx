import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import type { HolidayDTO, CreateHolidayDTO, UpdateHolidayDTO, CountryDTO } from '@shared/dto';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { parseUTCDateAsLocal } from '@/lib/utils';

interface HolidayFormData {
  holidayName: string;
  holidayDate: string;
  countryId: string;
  holidayIsRecurring: boolean;
  holidayIsHalfDay: boolean;
}

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday?: HolidayDTO;
  onSuccess: () => void;
}

export function HolidayFormDialog({
  open,
  onOpenChange,
  holiday,
  onSuccess,
}: HolidayFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!holiday;

  // State for countries
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HolidayFormData>({
    defaultValues: {
      holidayName: '',
      holidayDate: '',
      countryId: '',
      holidayIsRecurring: true,
      holidayIsHalfDay: false,
    },
  });

  // Watch form values for ComboBox and Checkbox
  const watchedCountryId = watch('countryId');
  const watchedIsRecurring = watch('holidayIsRecurring');
  const watchedIsHalfDay = watch('holidayIsHalfDay');

  // ComboBox options
  const countryOptions: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  // Load countries when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingCountries(true);
      apiGet<CountryDTO[]>('/api/countries')
        .then((data) => setCountries(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load countries', variant: 'destructive' }))
        .finally(() => setLoadingCountries(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (holiday) {
        const holidayDate = holiday.holidayDate
          ? format(parseUTCDateAsLocal(holiday.holidayDate), 'yyyy-MM-dd')
          : '';
        reset({
          holidayName: holiday.holidayName,
          holidayDate: holidayDate,
          countryId: holiday.countryId?.toString() || '',
          holidayIsRecurring: holiday.holidayIsRecurring ?? true,
          holidayIsHalfDay: holiday.holidayIsHalfDay ?? false,
        });
      } else {
        reset({
          holidayName: '',
          holidayDate: '',
          countryId: '',
          holidayIsRecurring: true,
          holidayIsHalfDay: false,
        });
      }
    }
  }, [open, holiday, reset]);

  const onSubmit = async (data: HolidayFormData) => {
    try {
      if (!data.countryId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a country',
          variant: 'destructive',
        });
        return;
      }

      if (isEditing) {
        const payload: UpdateHolidayDTO = {
          holidayName: data.holidayName.trim(),
          holidayDate: data.holidayDate,
          countryId: Number(data.countryId),
          holidayIsRecurring: data.holidayIsRecurring,
          holidayIsHalfDay: data.holidayIsHalfDay,
        };
        await apiPut<HolidayDTO, UpdateHolidayDTO>(`/api/holidays/${holiday.holidayId}`, payload);
        toast({
          title: 'Success',
          description: 'Holiday updated successfully',
        });
      } else {
        const payload: CreateHolidayDTO = {
          holidayName: data.holidayName.trim(),
          holidayDate: data.holidayDate,
          countryId: Number(data.countryId),
          holidayIsRecurring: data.holidayIsRecurring,
          holidayIsHalfDay: data.holidayIsHalfDay,
        };
        await apiPost<HolidayDTO, CreateHolidayDTO>('/api/holidays', payload);
        toast({
          title: 'Success',
          description: 'Holiday created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} holiday`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Holiday' : 'New Holiday'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the holiday information below.'
              : 'Fill in the details to create a new holiday.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holidayName">
                Holiday Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="holidayName"
                placeholder="e.g., Christmas Day"
                {...register('holidayName', {
                  required: 'Holiday name is required',
                  minLength: {
                    value: 2,
                    message: 'Holiday name must be at least 2 characters',
                  },
                })}
              />
              {errors.holidayName && (
                <p className="text-sm text-destructive">{errors.holidayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="holidayDate">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="holidayDate"
                type="date"
                {...register('holidayDate', {
                  required: 'Holiday date is required',
                })}
              />
              {errors.holidayDate && (
                <p className="text-sm text-destructive">{errors.holidayDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryId">
                Country <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={countryOptions}
                value={watchedCountryId}
                onValueChange={(value) => setValue('countryId', value)}
                placeholder="Select a country..."
                searchPlaceholder="Search countries..."
                emptyMessage="No countries found."
                disabled={loadingCountries}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="holidayIsRecurring"
                checked={watchedIsRecurring}
                onCheckedChange={(checked) => setValue('holidayIsRecurring', !!checked)}
              />
              <Label htmlFor="holidayIsRecurring" className="cursor-pointer">
                Recurring annually
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Check this if the holiday repeats every year on the same date
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="holidayIsHalfDay"
                checked={watchedIsHalfDay}
                onCheckedChange={(checked) => setValue('holidayIsHalfDay', !!checked)}
              />
              <Label htmlFor="holidayIsHalfDay" className="cursor-pointer">
                Half day
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Check this if the holiday is only half a working day
            </p>
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
