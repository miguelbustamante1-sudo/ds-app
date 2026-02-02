import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { detectOverlap } from '../../utils/overlapDetection';
import {
  isElSalvadorVacation,
  calculateCalendarDays,
  getExistingVacationDaysThisYear,
  validateSVVacation,
} from '../../utils/elSalvadorVacationValidation';

// Helper function to check if a date is a weekend (Saturday or Sunday)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

interface TimeOffStatus {
  statusId: number;
  statusName: string;
}

interface FormData {
  categoryId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  comment: string;
}

interface SupervisorTimeOffFormProps {
  teamMember: SupervisedTeamMemberDTO | null;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onSubmit: (data: CreateSupervisorTimeOffDTO) => Promise<void>;
  loading: boolean;
}

export function SupervisorTimeOffForm({
  teamMember,
  existingTimeOffs,
  onSubmit,
  loading,
}: SupervisorTimeOffFormProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      categoryId: '',
      startDate: undefined,
      endDate: undefined,
      comment: '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const categoryId = watch('categoryId');

  // Get the selected category's configuration
  const selectedCategory = categories.find(
    (cat) => cat.categoryId.toString() === categoryId
  );
  const isFixedDuration = selectedCategory?.categoryCountryIsFixedDuration ?? false;
  const fixedDays = selectedCategory?.categoryCountryFixedDays ?? null;

  // Get team member's end date for attrition validation
  const teamMemberEndDate = teamMember?.teamMemberEndDate
    ? parseUTCDateAsLocal(teamMember.teamMemberEndDate)
    : null;

  // Reset form when team member changes
  useEffect(() => {
    reset({
      categoryId: '',
      startDate: undefined,
      endDate: undefined,
      comment: '',
    });
  }, [teamMember?.teamMemberId, reset]);

  // Load categories for the team member's country
  useEffect(() => {
    async function loadData() {
      if (!teamMember?.teamMemberId) return;

      try {
        setLoadingCategories(true);
        // Load categories filtered by team member's country
        const categoriesData = await apiGet<CategoryByCountryDTO[]>(
          `/api/time-off-category/team-member/${teamMember.teamMemberId}`
        );
        setCategories(categoriesData);

        // Load statuses and find the "cancelled" status ID
        const statusesData = await apiGet<TimeOffStatus[]>('/api/time-off-statuses');
        const cancelledStatus = statusesData.find(
          (s) => s.statusName.toLowerCase().trim() === 'cancelled'
        );
        if (cancelledStatus) {
          setCancelledStatusId(cancelledStatus.statusId);
        }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load form data';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoadingCategories(false);
      }
    }
    loadData();
  }, [teamMember?.teamMemberId, toast]);

  // Auto-calculate end date for fixed-duration categories
  useEffect(() => {
    if (isFixedDuration && fixedDays && startDate) {
      const calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + fixedDays - 1);
      // Only update if different to avoid infinite loop
      if (!endDate || endDate.getTime() !== calculatedEndDate.getTime()) {
        setValue('endDate', calculatedEndDate);
      }
    }
  }, [isFixedDuration, fixedDays, startDate, endDate, setValue]);

  // Clear end date when start date changes and is higher than end date
  useEffect(() => {
    if (startDate && endDate && startDate > endDate && !isFixedDuration) {
      setValue('endDate', undefined);
    }
  }, [startDate, endDate, isFixedDuration, setValue]);

  // Validation: Date range
  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  // Validation: Start date cannot be on weekend
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;

  // Validation: Attrition date - check if dates exceed team member's end date
  const exceedsAttritionDate = teamMemberEndDate && (
    (startDate && startDate > teamMemberEndDate) ||
    (endDate && endDate > teamMemberEndDate)
  );

  // Overlap detection
  const overlappingTimeOffs =
    existingTimeOffs && startDate && endDate
      ? detectOverlap(startDate, endDate, existingTimeOffs, cancelledStatusId ?? -1)
      : [];
  const hasOverlap = overlappingTimeOffs.length > 0;

  // El Salvador Vacation validation
  const isSVVacation = isElSalvadorVacation(
    teamMember?.countryIso,
    selectedCategory?.categoryName
  );

  const requestedDays = startDate && endDate
    ? calculateCalendarDays(startDate, endDate)
    : 0;

  const existingVacationDays = isSVVacation
    ? getExistingVacationDaysThisYear(existingTimeOffs, cancelledStatusId)
    : 0;

  const svValidation = isSVVacation && requestedDays > 0
    ? validateSVVacation(requestedDays, existingVacationDays)
    : { valid: true, errorMessage: null, allowedDayOptions: [], existingDays: 0 };

  // Save button enabled state - block when overlap exists, exceeds attrition date, start date is weekend, or SV vacation invalid
  const canSave =
    teamMember &&
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateWeekend &&
    svValidation.valid &&
    !loading;

  const handleFormSubmit = useCallback(
    async (data: FormData) => {
      if (!teamMember || !data.startDate || !data.endDate) return;

      const payload: CreateSupervisorTimeOffDTO = {
        teamMemberId: teamMember.teamMemberId,
        categoryId: Number(data.categoryId),
        timeOffStartDate: data.startDate.toISOString(),
        timeOffEndDate: data.endDate.toISOString(),
        comment: data.comment || undefined,
      };

      await onSubmit(payload);
      reset();
    },
    [teamMember, onSubmit, reset]
  );

  if (!teamMember) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">New Time Off Request</h3>
        <div className="text-center py-8 text-muted-foreground">
          Select a team member to create a time off request.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">New Time Off Request</h3>
          <p className="text-sm text-muted-foreground">
            Creating request for <span className="font-medium">{teamMember.teamMemberFullName}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* First Row - Category and Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Category Select */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <ComboBox
                  options={categories.map((cat): ComboBoxOption => ({
                    value: cat.categoryId.toString(),
                    label: cat.categoryName,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={loadingCategories ? 'Loading...' : 'Select category'}
                  searchPlaceholder="Search categories..."
                  emptyMessage="No categories found."
                  disabled={loadingCategories}
                />
              )}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="startDate"
              control={control}
              rules={{ required: 'Start date is required' }}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      defaultMonth={field.value ?? new Date()}
                      disabled={(date) => {
                        const today = startOfDay(new Date());
                        if (date < today) return true;
                        if (isWeekend(date)) return true;
                        if (teamMemberEndDate && date > teamMemberEndDate) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>
              End Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="endDate"
              control={control}
              rules={{ required: 'End date is required' }}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      disabled={isFixedDuration}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      defaultMonth={field.value ?? startDate ?? new Date()}
                      disabled={(date) => {
                        const today = startOfDay(new Date());
                        if (date < today) return true;
                        if (startDate && date < startDate) return true;
                        if (teamMemberEndDate && date > teamMemberEndDate) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
        </div>

        {/* Second Row - Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Comment</Label>
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="comment"
                placeholder="Add a note..."
                rows={2}
              />
            )}
          />
        </div>

        {/* Validation Messages Row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {errors.categoryId && (
            <p className="text-destructive">{errors.categoryId.message}</p>
          )}
          {errors.startDate && (
            <p className="text-destructive">{errors.startDate.message}</p>
          )}
          {errors.endDate && (
            <p className="text-destructive">{errors.endDate.message}</p>
          )}
          {startDate && endDate && !isDateRangeValid && (
            <p className="text-destructive">End date must be on or after start date</p>
          )}
          {isStartDateWeekend && (
            <p className="text-destructive">Start date cannot be on a weekend</p>
          )}
          {isFixedDuration && fixedDays && (
            <p className="text-muted-foreground">
              Fixed duration: {fixedDays} day{fixedDays !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Overlap Warning */}
        {hasOverlap && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">
                This request overlaps with {overlappingTimeOffs.length} existing time off
                {overlappingTimeOffs.length > 1 ? 's' : ''}:
              </p>
              <ul className="list-disc list-inside text-sm mb-3">
                {overlappingTimeOffs.map((to) => (
                  <li key={to.timeOffId}>
                    {to.categoryName}: {formatUTCDate(to.timeOffStartDate, 'MMM dd')} -{' '}
                    {formatUTCDate(to.timeOffEndDate, 'MMM dd, yyyy')}
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                You need to first edit or cancel the existing time off before you can request one in the same date range.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Attrition Date Warning */}
        {exceedsAttritionDate && teamMemberEndDate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Time off cannot extend beyond {teamMember?.teamMemberFullName}'s end date ({format(teamMemberEndDate, 'PPP')}).
            </AlertDescription>
          </Alert>
        )}

        {/* El Salvador Vacation Info/Warning */}
        {isSVVacation && (
          <Alert variant={svValidation.valid ? 'info' : 'destructive'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">El Salvador Vacation Policy (7/8/15 Day Rule)</p>
              <p className="text-sm mb-2">
                Vacation days used this year: <span className="font-medium">{existingVacationDays}</span> of 15 days
              </p>
              {svValidation.allowedDayOptions.length > 0 && (
                <p className="text-sm mb-2">
                  Allowed request options: <span className="font-medium">{svValidation.allowedDayOptions.join(', ')} days</span>
                </p>
              )}
              {requestedDays > 0 && (
                <p className="text-sm mb-2">
                  Current request: <span className="font-medium">{requestedDays} days</span>
                </p>
              )}
              {svValidation.errorMessage && (
                <p className="text-sm font-medium text-destructive mt-2">{svValidation.errorMessage}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={!canSave}>
          {loading ? 'Creating...' : 'Create Time Off Request'}
        </Button>
      </form>
    </div>
  );
}
