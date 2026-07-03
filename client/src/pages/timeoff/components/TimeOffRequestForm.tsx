import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateMyTimeOffDTO } from '@shared/dto/TimeOff';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import { useTimeOffFormDates } from '@/hooks/useTimeOffFormDates';
import { calculateRequestedDays } from '../utils/fixedDurationEndDate';
import { useHolidayAwareness } from '../hooks/useHolidayAwareness';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';

// Helper function to check if a date is a weekend (Saturday or Sunday)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { SVVacationSplitMode, type SplitPeriod } from './SVVacationSplitMode';
import { useToast } from '@/hooks/use-toast';
import { detectOverlap } from '../utils/overlapDetection';
import { isElSalvadorVacation } from '../utils/elSalvadorVacationValidation';
import { computeCurrentPeriod, getNextAnniversaryDate } from '../utils/anniversaryWindow';
import { validateDaysBefore } from '../utils/daysBefore';
import { isDateInHolidayList } from '../utils/holidayValidation';
import { validateWorkdayBalance, computeGTAccruedVacationDays } from '../utils/workdayBalanceValidation';
import { validateGTPersonalDays } from '../utils/guatemalaPersonalDaysValidation';

interface TimeOffStatus {
  statusId: number;
  statusName: string;
}

interface MyTeamMemberProfile {
  teamMemberId: number;
  teamMemberStartDate: string | null;
  teamMemberEndDate: string | null;
  countryId: number | null;
  countryIso: string | null;
  hireDate: string | null;
}

interface FormData {
  categoryId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  comment: string;
}

interface TimeOffRequestFormProps {
  existingTimeOffs: TimeOffWithDetailsDTO[] | undefined;
  onSuccess: () => void;
  workdayBalance: { vacation: number; rawVacation: number; personalDays: number; personalDaysUsedThisMonth: number } | null;
}

export function TimeOffRequestForm({ existingTimeOffs, onSuccess, workdayBalance }: TimeOffRequestFormProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [userEndDate, setUserEndDate] = useState<Date | null>(null);
  const [userStartDate, setUserStartDate] = useState<Date | null>(null);
  const [userHireDate, setUserHireDate] = useState<Date | null>(null);
  const [userCountryIso, setUserCountryIso] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
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
  const maxDays = selectedCategory?.categoryCountryMaxDays ?? 0;

  // Load categories (filtered by user's country), statuses, and user profile on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load categories filtered by current user's country
        const categoriesData = await apiGet<CategoryByCountryDTO[]>('/api/time-off-category/my-categories');
        setCategories(categoriesData);

        // Load statuses and find the "cancelled" status ID
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
        if (profile.teamMemberStartDate) {
          setUserStartDate(parseUTCDateAsLocal(profile.teamMemberStartDate));
        }
        if (profile.hireDate) {
          setUserHireDate(parseUTCDateAsLocal(profile.hireDate));
        }
        setUserCountryIso(profile.countryIso);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setLoadingCategories(false);
      }
    }
    loadData();
  }, [toast]);

  useTimeOffFormDates({
    categoryId,
    startDate,
    endDate,
    isFixedDuration,
    fixedDays,
    isCalendar,
    setValue,
    clearErrors,
  });

  const {
    svHolidaysInRange,
    gtWeekdayHolidaysInRange,
    gtNetVacationDays,
    holidayDatesForCalendar,
  } = useHolidayAwareness({
    countryIso: userCountryIso,
    startDate,
    endDate,
    categoryName: selectedCategory?.categoryName,
  });

  // Validation: Date range
  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  // Validation: Start date cannot be on weekend
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;

  // Validation: Start date cannot be on a public holiday
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, holidayDatesForCalendar) : false;

  // Validation: Attrition date - check if dates exceed user's end date
  const exceedsAttritionDate = userEndDate && (
    (startDate && startDate > userEndDate) ||
    (endDate && endDate > userEndDate)
  );

  // Overlap detection (use cancelledStatusId from API, fallback to -1 if not loaded yet)
  const overlappingTimeOffs = existingTimeOffs && startDate && endDate
    ? detectOverlap(startDate, endDate, existingTimeOffs, cancelledStatusId ?? -1, 6)
    : [];
  const hasOverlap = overlappingTimeOffs.length > 0;

  // El Salvador Vacation validation
  const isSVVacation = isElSalvadorVacation(
    userCountryIso,
    selectedCategory?.categoryName
  );

  // SV 15-day mode: applies whenever SV + Vacation.
  // Must NOT use isFixedDuration — see requirements.
  const isSV15DayMode = isSVVacation;

  // Auto-calculate end date for SV 15-day mode (start + 14 = 15 inclusive calendar days)
  useEffect(() => {
    if (!isSV15DayMode) return;
    if (!startDate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue('endDate' as any, undefined as any);
      return;
    }
    const sv15End = addDays(startDate, 14);
    if (!endDate || endDate.getTime() !== sv15End.getTime()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue('endDate' as any, sv15End as any);
    }
  }, [isSV15DayMode, startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset split mode when category changes
  useEffect(() => {
    setIsSplitMode(false);
  }, [categoryId]);

  // Days hint: respects isCalendar flag (calendar days vs workdays only)
  const hintDays = startDate && endDate && isDateRangeValid
    ? calculateRequestedDays(startDate, endDate, isCalendar)
    : 0;

  // Days-before notice period validation
  const daysBefore = selectedCategory?.categoryCountryDaysBefore ?? 0;
  const daysBeforeValidation = validateDaysBefore(
    startDate,
    daysBefore,
    selectedCategory?.categoryName ?? ''
  );

  // Workday balance validation — for GT vacation, add accrued days (1.25/month since 2025-12-31)
  const isGTVacation = userCountryIso === 'GT' && selectedCategory?.categoryName?.toLowerCase().trim() === 'vacation';
  const isVacation = selectedCategory?.categoryName?.toLowerCase().trim() === 'vacation';
  const userMemberStartDate = userHireDate ?? userStartDate;
  const nextAnniversaryDate = userMemberStartDate ? getNextAnniversaryDate(userMemberStartDate) : null;
  const gtAccruedDays = isGTVacation && startDate ? computeGTAccruedVacationDays(startDate) : 0;
  const anniversaryBonus = isVacation && !isGTVacation && startDate && nextAnniversaryDate && startDate >= nextAnniversaryDate ? 15 : 0;
  const totalVacationAdjustment = gtAccruedDays + anniversaryBonus;
  const balanceForValidation = workdayBalance && totalVacationAdjustment > 0
    ? { ...workdayBalance, vacation: workdayBalance.vacation + totalVacationAdjustment }
    : workdayBalance;
  const balanceValidation = selectedCategory && hintDays > 0
    ? validateWorkdayBalance(selectedCategory.categoryName, hintDays, balanceForValidation)
    : { valid: true, errorMessage: null, available: 0 };

  const gtPersonalDaysWarning = selectedCategory && hintDays > 0
    ? validateGTPersonalDays(
        userCountryIso,
        selectedCategory.categoryName,
        hintDays,
        workdayBalance?.personalDaysUsedThisMonth ?? 0
      )
    : null;

  const startDatePeriod = userMemberStartDate && startDate
    ? computeCurrentPeriod(userMemberStartDate, startDate)
    : null;
  const endDatePeriod = userMemberStartDate && endDate
    ? computeCurrentPeriod(userMemberStartDate, endDate)
    : null;
  const spansAnniversaryBoundary =
    !!isDateRangeValid &&
    startDatePeriod !== null &&
    endDatePeriod !== null &&
    startDatePeriod !== endDatePeriod;

  // Max days per request validation
  const exceedsMaxDays = maxDays > 0 && hintDays > maxDays;

  // Save button enabled state - block when overlap exists, exceeds attrition date, SV validation fails, days-before rule violated, or insufficient balance
  const canSave =
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateWeekend &&
    !isStartDateHoliday &&
    daysBeforeValidation.valid &&
    balanceValidation.valid &&
    !exceedsMaxDays &&
    !gtPersonalDaysWarning?.showLimitWarning &&
    !!comment?.trim() &&
    !submitting;

  const handleSaveSplit = useCallback(async (periodA: SplitPeriod, periodB: SplitPeriod) => {
    setSubmitting(true);
    try {
      await apiPost('/api/time-offs/my-requests/split', {
        categoryId: Number(categoryId),
        periodA: {
          startDate: periodA.startDate.toISOString(),
          endDate: periodA.endDate.toISOString(),
        },
        periodB: {
          startDate: periodB.startDate.toISOString(),
          endDate: periodB.endDate.toISOString(),
        },
        comment,
      });
      toast({ title: 'Success', description: 'Split vacation requests created successfully' });
      reset();
      setIsSplitMode(false);
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create split vacation requests';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [categoryId, comment, reset, onSuccess, toast]);

  const onSubmit = useCallback(async (data: FormData) => {
    if (!data.startDate || !data.endDate) return;

    setSubmitting(true);
    try {
      const payload: CreateMyTimeOffDTO = {
        categoryId: Number(data.categoryId),
        timeOffStartDate: data.startDate.toISOString(),
        timeOffEndDate: data.endDate.toISOString(),
        comment: data.comment,
      };

      await apiPost('/api/time-offs/my-requests', payload);

      toast({
        title: 'Success',
        description: 'Time off request created successfully',
      });

      // Reset form after success
      reset();
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create time off request';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [reset, onSuccess, toast]);

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">New Time Off Request</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {errors.categoryId && (
            <p className="text-sm text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Date range area — replaced in-place by split mode when active */}
        {isSplitMode && startDate ? (
          <SVVacationSplitMode
            anchorStartDate={startDate}
            countryIso={userCountryIso}
            userEndDate={userEndDate}
            comment={comment ?? ''}
            submitting={submitting}
            onBack={() => setIsSplitMode(false)}
            onSaveSplit={handleSaveSplit}
          />
        ) : (
          <>
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
          {isStartDateWeekend && (
            <p className="text-sm text-destructive">Start date cannot be on a weekend</p>
          )}
          {isStartDateHoliday && (
            <p className="text-sm text-destructive">Start date cannot be on a public holiday</p>
          )}
          {isVacation && startDatePeriod && (
            <p className="text-sm text-muted-foreground">Anniversary period: {startDatePeriod}</p>
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
                    disabled={isFixedDuration || isSV15DayMode}
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
          {isSV15DayMode && (
            <p className="text-sm text-muted-foreground">
              15 calendar days (auto-set for El Salvador)
            </p>
          )}
          {!isFixedDuration && !isSV15DayMode && hintDays > 0 && (
            <p className="text-sm text-muted-foreground">
              {hintDays} day{hintDays !== 1 ? 's' : ''}
            </p>
          )}
          {maxDays > 0 && (
            <p className="text-sm text-muted-foreground">
              Max. {maxDays} day{maxDays !== 1 ? 's' : ''} per request
            </p>
          )}
          {exceedsMaxDays && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This request exceeds the maximum of {maxDays} day{maxDays !== 1 ? 's' : ''} per request. You selected {hintDays} days.
              </AlertDescription>
            </Alert>
          )}
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
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

        {/* Anniversary Boundary Notice */}
        {spansAnniversaryBoundary && (
          <Alert>
            <AlertDescription>
              This request spans two anniversary periods ({startDatePeriod} → {endDatePeriod}). Days from each period will be tracked separately.
            </AlertDescription>
          </Alert>
        )}

        {/* Overlap Warning */}
        {hasOverlap && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">
                This request overlaps with {overlappingTimeOffs.length} existing time off{overlappingTimeOffs.length > 1 ? 's' : ''}:
              </p>
              <ul className="list-disc list-inside text-sm mb-3">
                {overlappingTimeOffs.map((to) => (
                  <li key={to.timeOffId}>
                    {to.categoryName}: {formatUTCDate(to.timeOffStartDate, 'MMM dd')} - {formatUTCDate(to.timeOffEndDate, 'MMM dd, yyyy')}
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

        {/* Workday Balance Warning */}
        {!balanceValidation.valid && balanceValidation.errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{balanceValidation.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* GT Personal Days Monthly Advisory */}
        {gtPersonalDaysWarning?.showMonthlyNotice && !gtPersonalDaysWarning.showLimitWarning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This request will use {gtPersonalDaysWarning.requestedDays} of your {gtPersonalDaysWarning.personalDaysRemainingThisMonth} remaining Personal Day{gtPersonalDaysWarning.personalDaysRemainingThisMonth !== 1 ? 's' : ''} this month.
            </AlertDescription>
          </Alert>
        )}
        {gtPersonalDaysWarning?.showLimitWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You only have {gtPersonalDaysWarning.personalDaysRemainingThisMonth} Personal Day{gtPersonalDaysWarning.personalDaysRemainingThisMonth !== 1 ? 's' : ''} remaining this month. This request of {gtPersonalDaysWarning.requestedDays} day{gtPersonalDaysWarning.requestedDays !== 1 ? 's' : ''} would exceed the monthly limit — this request cannot be submitted.
            </AlertDescription>
          </Alert>
        )}

          </>
        )}

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">
            Comment <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="comment"
            control={control}
            rules={{ required: 'Comment is required' }}
            render={({ field }) => (
              <Textarea
                {...field}
                id="comment"
                placeholder="Add a note about this request..."
                rows={2}
              />
            )}
          />
          {errors.comment && (
            <p className="text-sm text-destructive">{errors.comment.message}</p>
          )}
        </div>

        {/* Action buttons — hidden when split mode is active (Save Split lives inside SVVacationSplitMode) */}
        {!isSplitMode && (
          isSV15DayMode ? (
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!canSave}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!startDate || submitting}
                onClick={() => setIsSplitMode(true)}
              >
                Split
              </Button>
            </div>
          ) : (
            <Button type="submit" className="w-full" disabled={!canSave}>
              {submitting ? 'Saving...' : 'Submit Request'}
            </Button>
          )
        )}
      </form>
    </div>
  );
}
