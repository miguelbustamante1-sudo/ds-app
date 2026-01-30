import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface EditSupervisorTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff: TimeOffWithDetailsDTO | null;
  teamMember: SupervisedTeamMemberDTO | null;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onConfirm: (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => Promise<void>;
  loading: boolean;
}

export function EditSupervisorTimeOffDialog({
  open,
  onOpenChange,
  timeOff,
  teamMember,
  existingTimeOffs,
  onConfirm,
  loading,
}: EditSupervisorTimeOffDialogProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { toast } = useToast();

  // Get team member's end date for attrition validation
  const teamMemberEndDate = teamMember?.teamMemberEndDate
    ? parseUTCDateAsLocal(teamMember.teamMemberEndDate)
    : null;

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

  // Load categories for the team member's country
  useEffect(() => {
    async function loadData() {
      if (!teamMember?.teamMemberId || !open) return;

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
  }, [teamMember?.teamMemberId, open, toast]);

  // Reset form when timeOff changes or dialog opens
  useEffect(() => {
    if (timeOff && open) {
      reset({
        categoryId: timeOff.categoryId?.toString() ?? '',
        startDate: parseUTCDateAsLocal(timeOff.timeOffStartDate),
        endDate: parseUTCDateAsLocal(timeOff.timeOffEndDate),
        comment: '',
      });
    }
  }, [timeOff, open, reset]);

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

  // Validation: Date range
  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  // Validation: Start date cannot be on weekend
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;

  // Validation: Attrition date - check if dates exceed team member's end date
  const exceedsAttritionDate = teamMemberEndDate && (
    (startDate && startDate > teamMemberEndDate) ||
    (endDate && endDate > teamMemberEndDate)
  );

  // Overlap detection - exclude current timeOff from the list
  const otherTimeOffs = existingTimeOffs.filter((to) => to.timeOffId !== timeOff?.timeOffId);
  const overlappingTimeOffs =
    startDate && endDate
      ? detectOverlap(startDate, endDate, otherTimeOffs, cancelledStatusId ?? -1)
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

  // Pass timeOff?.timeOffId to exclude the time-off being edited from the calculation
  const existingVacationDays = isSVVacation
    ? getExistingVacationDaysThisYear(existingTimeOffs, cancelledStatusId, timeOff?.timeOffId)
    : 0;

  const svValidation = isSVVacation && requestedDays > 0
    ? validateSVVacation(requestedDays, existingVacationDays)
    : { valid: true, errorMessage: null, allowedDayOptions: [], existingDays: 0 };

  // Save button enabled state - block when overlap exists, exceeds attrition date, start date is weekend, or SV vacation invalid
  const canSave =
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
      if (!timeOff || !data.startDate || !data.endDate) return;

      const payload: UpdateSupervisorTimeOffDTO = {
        categoryId: Number(data.categoryId),
        timeOffStartDate: data.startDate.toISOString(),
        timeOffEndDate: data.endDate.toISOString(),
        comment: data.comment || undefined,
      };

      await onConfirm(timeOff.timeOffId, payload);
      onOpenChange(false);
    },
    [timeOff, onConfirm, onOpenChange]
  );

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!timeOff || !teamMember) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Off Request</DialogTitle>
          <DialogDescription>
            Update the time off request for {teamMember.teamMemberFullName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          {/* Category Select */}
          <div className="space-y-2">
            <Label htmlFor="edit-category">
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
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
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
                        if (isWeekend(date)) return true;
                        if (teamMemberEndDate && date > teamMemberEndDate) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
            {isStartDateWeekend && (
              <p className="text-sm text-destructive">Start date cannot be on a weekend</p>
            )}
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
                        if (startDate && date < startDate) return true;
                        if (teamMemberEndDate && date > teamMemberEndDate) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {isFixedDuration && fixedDays && (
              <p className="text-sm text-muted-foreground">
                This category has a fixed duration of {fixedDays} day{fixedDays !== 1 ? 's' : ''}.
              </p>
            )}
            {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            {startDate && endDate && !isDateRangeValid && (
              <p className="text-sm text-destructive">End date must be on or after start date</p>
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
                Time off cannot extend beyond {teamMember.teamMemberFullName}'s end date ({format(teamMemberEndDate, 'PPP')}).
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

          {/* Comment (optional) */}
          <div className="space-y-2">
            <Label htmlFor="edit-comment">Comment (optional)</Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="edit-comment"
                  placeholder="Add a note about this change..."
                  rows={2}
                />
              )}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
