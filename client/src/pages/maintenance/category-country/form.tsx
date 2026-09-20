import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  CategoryCountryDTO,
  CreateCategoryCountryDTO,
  UpdateCategoryCountryDTO,
  TimeOffCategoryDTO,
  CountryDTO,
} from '@shared/dto';
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

interface CategoryCountryFormData {
  categoryId: string;
  countryId: string;
  categoryCountryStatus: string;
  categoryCountryAllowHalfDay: boolean;
  categoryCountryIsFixedDuration: boolean;
  categoryCountryFixedDays: string;
  categoryCountryIsCalendar: boolean;
  categoryCountryCountHolidays: boolean;
  categoryCountryDaysBefore: string;
}

interface CategoryCountryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CategoryCountryDTO;
  onSuccess: () => void;
}

export function CategoryCountryFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: CategoryCountryFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!item;
  const [categories, setCategories] = useState<TimeOffCategoryDTO[]>([]);
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryCountryFormData>({
    defaultValues: {
      categoryId: '',
      countryId: '',
      categoryCountryStatus: '1',
      categoryCountryAllowHalfDay: false,
      categoryCountryIsFixedDuration: false,
      categoryCountryFixedDays: '',
      categoryCountryIsCalendar: false,
      categoryCountryCountHolidays: false,
      categoryCountryDaysBefore: '0',
    },
  });

  const categoryIdValue = watch('categoryId');
  const countryIdValue = watch('countryId');
  const statusValue = watch('categoryCountryStatus');
  const isFixedDuration = watch('categoryCountryIsFixedDuration');

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingCategories(true);
      setLoadingCountries(true);
      try {
        const [cats, ctrs] = await Promise.all([
          apiGet<TimeOffCategoryDTO[]>('/api/time-off-category'),
          apiGet<CountryDTO[]>('/api/countries'),
        ]);
        setCategories(cats);
        setCountries(ctrs);
      } catch (error: any) {
        console.error('Failed to load options', error);
        toast({
          title: 'Warning',
          description: 'Failed to load categories or countries',
          variant: 'destructive',
        });
      } finally {
        setLoadingCategories(false);
        setLoadingCountries(false);
      }
    };

    if (open) {
      loadOptions();
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          categoryId: item.categoryId.toString(),
          countryId: item.countryId.toString(),
          categoryCountryStatus: item.categoryCountryStatus.toString(),
          categoryCountryAllowHalfDay: item.categoryCountryAllowHalfDay,
          categoryCountryIsFixedDuration: item.categoryCountryIsFixedDuration,
          categoryCountryFixedDays: item.categoryCountryFixedDays?.toString() ?? '',
          categoryCountryIsCalendar: item.categoryCountryIsCalendar,
          categoryCountryCountHolidays: item.categoryCountryCountHolidays,
          categoryCountryDaysBefore: item.categoryCountryDaysBefore.toString(),
        });
      } else {
        reset({
          categoryId: '',
          countryId: '',
          categoryCountryStatus: '1',
          categoryCountryAllowHalfDay: false,
          categoryCountryIsFixedDuration: false,
          categoryCountryFixedDays: '',
          categoryCountryIsCalendar: false,
          categoryCountryCountHolidays: false,
          categoryCountryDaysBefore: '0',
        });
      }
    }
  }, [open, item, reset]);

  const onSubmit = async (data: CategoryCountryFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateCategoryCountryDTO = {
          categoryId: Number(data.categoryId),
          countryId: Number(data.countryId),
          categoryCountryStatus: Number(data.categoryCountryStatus),
          categoryCountryAllowHalfDay: data.categoryCountryAllowHalfDay,
          categoryCountryIsFixedDuration: data.categoryCountryIsFixedDuration,
          categoryCountryFixedDays: data.categoryCountryIsFixedDuration && data.categoryCountryFixedDays
            ? Number(data.categoryCountryFixedDays)
            : null,
          categoryCountryIsCalendar: data.categoryCountryIsCalendar,
          categoryCountryCountHolidays: data.categoryCountryCountHolidays,
          categoryCountryDaysBefore: Number(data.categoryCountryDaysBefore),
        };
        await apiPut<CategoryCountryDTO, UpdateCategoryCountryDTO>(
          `/api/time-off-categories-by-country/${item.categoryCountryId}`,
          payload
        );
        toast({ title: 'Success', description: 'Category by country updated successfully' });
      } else {
        const payload: CreateCategoryCountryDTO = {
          categoryId: Number(data.categoryId),
          countryId: Number(data.countryId),
          categoryCountryStatus: Number(data.categoryCountryStatus),
          categoryCountryAllowHalfDay: data.categoryCountryAllowHalfDay,
          categoryCountryIsFixedDuration: data.categoryCountryIsFixedDuration,
          categoryCountryFixedDays: data.categoryCountryIsFixedDuration && data.categoryCountryFixedDays
            ? Number(data.categoryCountryFixedDays)
            : null,
          categoryCountryIsCalendar: data.categoryCountryIsCalendar,
          categoryCountryCountHolidays: data.categoryCountryCountHolidays,
          categoryCountryDaysBefore: Number(data.categoryCountryDaysBefore),
        };
        await apiPost<CategoryCountryDTO, CreateCategoryCountryDTO>(
          '/api/time-off-categories-by-country',
          payload
        );
        toast({ title: 'Success', description: 'Category by country created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} category by country`,
        variant: 'destructive',
      });
    }
  };

  const categoryOptions: ComboBoxOption[] = categories.map((cat) => ({
    value: cat.categoryId.toString(),
    label: cat.categoryName,
  }));

  const countryOptions: ComboBoxOption[] = countries.map((ctr) => ({
    value: ctr.countryId.toString(),
    label: ctr.countryName,
  }));

  const statusOptions: ComboBoxOption[] = [
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category by Country' : 'New Category by Country'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the category-country settings below.'
              : 'Fill in the details to create a new category-country entry.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={categoryOptions}
                value={categoryIdValue}
                onValueChange={(value) => setValue('categoryId', value)}
                placeholder={loadingCategories ? 'Loading...' : 'Select a category'}
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found."
                disabled={loadingCategories}
              />
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
              <input
                type="hidden"
                {...register('categoryId', { required: 'Category is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Country <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={countryOptions}
                value={countryIdValue}
                onValueChange={(value) => setValue('countryId', value)}
                placeholder={loadingCountries ? 'Loading...' : 'Select a country'}
                searchPlaceholder="Search countries..."
                emptyMessage="No countries found."
                disabled={loadingCountries}
              />
              {errors.countryId && (
                <p className="text-sm text-destructive">{errors.countryId.message}</p>
              )}
              <input
                type="hidden"
                {...register('countryId', { required: 'Country is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <ComboBox
                options={statusOptions}
                value={statusValue}
                onValueChange={(value) => setValue('categoryCountryStatus', value)}
                placeholder="Select status"
                searchPlaceholder="Search..."
                emptyMessage="No options."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="categoryCountryAllowHalfDay"
                type="checkbox"
                className="h-4 w-4 rounded border-uds-system-grey-300"
                {...register('categoryCountryAllowHalfDay')}
              />
              <Label htmlFor="categoryCountryAllowHalfDay">Allow Half Day</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="categoryCountryIsFixedDuration"
                type="checkbox"
                className="h-4 w-4 rounded border-uds-system-grey-300"
                {...register('categoryCountryIsFixedDuration')}
              />
              <Label htmlFor="categoryCountryIsFixedDuration">Fixed Duration</Label>
            </div>

            {isFixedDuration && (
              <div className="space-y-2">
                <Label htmlFor="categoryCountryFixedDays">Fixed Days</Label>
                <Input
                  id="categoryCountryFixedDays"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g., 5"
                  {...register('categoryCountryFixedDays', {
                    validate: (value) => {
                      if (isFixedDuration && !value) return 'Fixed days is required when fixed duration is enabled';
                      return true;
                    },
                  })}
                />
                {errors.categoryCountryFixedDays && (
                  <p className="text-sm text-destructive">{errors.categoryCountryFixedDays.message}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="categoryCountryIsCalendar"
                type="checkbox"
                className="h-4 w-4 rounded border-uds-system-grey-300"
                {...register('categoryCountryIsCalendar')}
              />
              <Label htmlFor="categoryCountryIsCalendar">Count Weekends</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="categoryCountryCountHolidays"
                type="checkbox"
                className="h-4 w-4 rounded border-uds-system-grey-300"
                {...register('categoryCountryCountHolidays')}
              />
              <Label htmlFor="categoryCountryCountHolidays">Count Holidays</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryCountryDaysBefore">Days Before</Label>
              <Input
                id="categoryCountryDaysBefore"
                type="number"
                min="0"
                placeholder="0"
                {...register('categoryCountryDaysBefore')}
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
