import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, UpdateMyTimeOffDTO } from '@shared/dto/TimeOff';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import { calculateFixedDurationEndDate, calculateRequestedDays } from '../utils/fixedDurationEndDate';
import { useHolidayAwareness } from '../hooks/useHolidayAwareness';
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
import { detectOverlap } from '../utils/overlapDetection';
import {
  isElSalvadorVacation,
  calculateCalendarDays,
  getExistingVacationDaysThisYear,
  validateSVVacation,
} from '../utils/elSalvadorVacationValidation';
import { validateDaysBefore } from '../utils/daysBefore';
import { isDateInHolidayList } from '../utils/holidayValidation';
import { validateWorkdayBalance } from '../utils/workdayBalanceValidation';

interface TimeOffStatus {
  statusId: number;
  statusName: string;
}

interface MyTeamMemberProfile {
  teamMemberId: number;
  teamMemberEndDate: string | null;
  countryId: number | null;
  countryIso: string | null;  // ISO code (e.g., "SV", "GT")
}

interface FormData {
  categoryId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  comment: string;
}

interface EditTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff: TimeOffWithDetailsDTO | null;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onConfirm: (timeOffId: number, data: UpdateMyTimeOffDTO) => Promise<void>;
  loading: boolean;
  workdayBalance: { vacation: number; personalDays: number } | null;
}

export function EditTimeOffDialog({
  open,
  onOpenChange,
  timeOff,
  existingTimeOffs,
  onConfirm,
  loading,
  workdayBalance,
}: EditTimeOffDialogProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [userEndDate, setUserEndDate] = useState<Date | null>(null);
  const [userCountryIso, setUserCountryIso] = useState<string | null>(null);
  const [userCountryId, setUserCountryId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
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
  const comment = watch('comment');

  // Get the selected category's configuration
  const selectedCategory = categories.find(
    (cat) => cat.categoryId.toString() === categoryId
  );
  const isFixedDuration = selectedCategory?.categoryCountryIsFixedDuration ?? false;
  const fixedDays = selectedCategory?.categoryCountryFixedDays ?? null;
  const isCalendar = selectedCategory?.categoryCountryIsCalendar ?? false;

  const {
    svHolidaysInRange,
    gtWeekdayHolidaysInRange,
    gtNetVacationDays,
    holidayDatesForCalendar,
  } = useHolidayAwareness({
    countryIso: userCountryIso,
    countryId: userCountryId,
    startDate,
    endDate,
    categoryName: selectedCategory?.categoryName,
  });

  // Load categories, statuses, and user profile on mount
  useEffect(() => {
    async function loadData() {
      try {
        const categoriesData = await apiGet<CategoryByCountryDTO[]>('/api/time-off-category/my-categories');
        setCategories(categoriesData);

        const statusesData = await apiGet<TimeOffStatus[]>('/api/time-off-statuses');
        const cancelledStatus = statusesData.find(
          (s) => s.statusName.toLowerCase().trim() === 'cancelled'
        );
        if (cancelledStatus) {
          setCancelledStatusId(cancelledStatus.statusId);
        }

        // Load user's team member profile for attrition date and country validation
        const profile = await apiGet<MyTeamMemberProfile>('/api/team-members/me');
        if (profile.teamMemberEndDate) {
          setUserEndDate(parseUTCDateAsLocal(profile.teamMemberEndDate));
        }
        setUserCountryIso(profile.countryIso);
        setUserCountryId(profile.countryId);
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
  }, [toast]);

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
      const calculatedEndDate = calculateFixedDurationEndDate(startDate, fixedDays, isCalendar);
      // Only update if different to avoid infinite loop
      if (!endDate || endDate.getTime() !== calculatedEndDate.getTime()) {
        setValue('endDate', calculatedEndDate);
      }
    }
  }, [isFixedDuration, fixedDays, isCalendar, startDate, endDate, setValue]);

  // Validation: Date range
  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  // Validation: Start date cannot be on a public holiday
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, holidayDatesForCalendar) : false;

  // Validation: Attrition date - check if dates exceed user's end date
  const exceedsAttritionDate = userEndDate && (
    (startDate && startDate > userEndDate) ||
    (endDate && endDate > userEndDate)
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
    userCountryIso,
    selectedCategory?.categoryName
  );

  const requestedDays = startDate && endDate
    ? calculateCalendarDays(startDate, endDate)
    : 0;

  const hintDays = startDate && endDate && isDateRangeValid
    ? calculateRequestedDays(startDate, endDate, isCalendar)
    : 0;

  // Pass timeOff?.timeOffId to exclude the time-off being edited from the calculation
  const existingVacationDays = isSVVacation
    ? getExistingVacationDaysThisYear(existingTimeOffs, cancelledStatusId, timeOff?.timeOffId)
    : 0;

  const svValidation = isSVVacation && requestedDays > 0
    ? validateSVVacation(requestedDays, existingVacationDays)
    : { valid: true, errorMessage: null, allowedDayOptions: [], existingDays: 0 };

  // Days-before notice period validation
  const daysBefore = selectedCategory?.categoryCountryDaysBefore ?? 0;
  const daysBeforeValidation = validateDaysBefore(
    startDate,
    daysBefore,
    selectedCategory?.categoryName ?? ''
  );

  // Workday balance validation — add back the original request's days since they were already deducted
  const categoryNameLower = selectedCategory?.categoryName?.toLowerCase().trim();
  const isVacationCategory = categoryNameLower === 'vacation';
  const isPersonalDayCategory = categoryNameLower === 'personal day' || categoryNameLower === 'personal days';
  const oldRequestDays = timeOff?.timeOffDays ?? 0;
  const effectiveBalance = workdayBalance
    ? {
        vacation: workdayBalance.vacation + (isVacationCategory ? oldRequestDays : 0),
        personalDays: workdayBalance.personalDays + (isPersonalDayCategory ? oldRequestDays : 0),
      }
    : null;
  const balanceValidation = selectedCategory && hintDays > 0
    ? validateWorkdayBalance(selectedCategory.categoryName, hintDays, effectiveBalance)
    : { valid: true, errorMessage: null, available: 0 };

  // Save button enabled state - block when overlap exists, exceeds attrition date, SV validation fails, days-before rule violated, or insufficient balance
  const canSave =
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateHoliday &&
    svValidation.valid &&
    daysBeforeValidation.valid &&
    balanceValidation.valid &&
    !!comment?.trim() &&
    !loading;

  const handleFormSubmit = useCallback(
    async (data: FormData) => {
      if (!timeOff || !data.startDate || !data.endDate) return;

      const payload: UpdateMyTimeOffDTO = {
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

  if (!timeOff) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Off Request</DialogTitle>
          <DialogDescription>
            Update the details of your time off request.
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
                        const today = startOfDay(new Date());
                        if (date < today) return true;
                        if (userEndDate && date > userEndDate) return true;
                        if (isDateInHolidayList(date, holidayDatesForCalendar)) return true;
                        return false;
                      }}
                      modifiers={{ holiday: holidayDatesForCalendar }}
                      modifiersClassNames={{ holiday: 'bg-amber-100 text-amber-800 font-medium' }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
            {isStartDateHoliday && (
              <p className="text-sm text-destructive">Start date cannot be on a public holiday</p>
            )}
          </div>

          {/* Days-Before Notice Period Warning */}
          {!daysBeforeValidation.valid && daysBeforeValidation.errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{daysBeforeValidation.errorMessage}</AlertDescription>
            </Alert>
          )}

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
                        if (userEndDate && date > userEndDate) return true;
                        return false;
                      }}
                      modifiers={{ holiday: holidayDatesForCalendar }}
                      modifiersClassNames={{ holiday: 'bg-amber-100 text-amber-800 font-medium' }}
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
            {!isFixedDuration && hintDays > 0 && (
              <p className="text-sm text-muted-foreground">
                {hintDays} day{hintDays !== 1 ? 's' : ''}
              </p>
            )}
            {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            {startDate && endDate && !isDateRangeValid && (
              <p className="text-sm text-destructive">End date must be on or after start date</p>
            )}
          </div>

          {/* Holiday Awareness Alerts */}
          {svHolidaysInRange.length > 0 && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">
                  Your request includes the following public holiday(s). These days will be counted as vacation days.
                </p>
                <ul className="list-disc list-inside text-sm">
                  {svHolidaysInRange.map(({ holiday, effectiveDate }) => (
                    <li key={holiday.holidayId}>
                      {holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}
                      {holiday.holidayIsHalfDay && ' (half day)'}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {gtWeekdayHolidaysInRange.length > 0 && gtNetVacationDays !== null && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">
                  The following public holiday(s) fall within your request and will not be counted as vacation days:
                </p>
                <ul className="list-disc list-inside text-sm mb-2">
                  {gtWeekdayHolidaysInRange.map(({ holiday, effectiveDate }) => (
                    <li key={holiday.holidayId}>
                      {holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium">
                  Net vacation days: <strong>{gtNetVacationDays} day{gtNetVacationDays !== 1 ? 's' : ''}</strong>
                </p>
              </AlertDescription>
            </Alert>
          )}

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
          {exceedsAttritionDate && userEndDate && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Time off cannot extend beyond your end date ({format(userEndDate, 'PPP')}).
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

          {/* Workday Balance Warning */}
          {!balanceValidation.valid && balanceValidation.errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{balanceValidation.errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="edit-comment">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="comment"
              control={control}
              rules={{ required: 'Comment is required' }}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="edit-comment"
                  placeholder="Add a note about this change..."
                  rows={2}
                />
              )}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
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
