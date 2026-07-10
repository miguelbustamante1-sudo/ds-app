import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import { useTimeOffFormDates } from '@/hooks/useTimeOffFormDates';
import { calculateRequestedDays } from '../../utils/fixedDurationEndDate';
import { useHolidayAwareness } from '../../hooks/useHolidayAwareness';
import { HolidayProvider, useHolidayContext } from '../../context/HolidayContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { detectOverlap } from '../../utils/overlapDetection';
import {
  VACATION_CATEGORY_NAME,
  isElSalvadorVacation,
} from '../../utils/elSalvadorVacationValidation';
import { computeCurrentPeriod } from '../../utils/anniversaryWindow';
import { validateDaysBefore } from '../../utils/daysBefore';
import { isDateInHolidayList } from '../../utils/holidayValidation';
import { SVVacationSplitMode, type SplitPeriod } from '../../components/SVVacationSplitMode';
import { validateWorkdayBalance, computeGTAccruedVacationDays } from '../../utils/workdayBalanceValidation';
import { validateGTPersonalDays, getPersonalDaysUsedInMonth } from '../../utils/guatemalaPersonalDaysValidation';

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

export type CategoryMode = 'all' | 'vacation-only' | 'exclude-vacation';

interface SupervisorTimeOffFormProps {
  teamMember: SupervisedTeamMemberDTO | null;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onSubmit: (data: CreateSupervisorTimeOffDTO) => Promise<void>;
  loading: boolean;
  categoryMode?: CategoryMode;
  workdayBalance?: { vacation: number; personalDays: number; personalDaysUsedThisMonth: number } | null;
}

export function SupervisorTimeOffForm(props: SupervisorTimeOffFormProps) {
  return (
    <HolidayProvider countryId={props.teamMember?.countryId} countryIso={props.teamMember?.countryIso}>
      <SupervisorTimeOffFormInner {...props} />
    </HolidayProvider>
  );
}

function SupervisorTimeOffFormInner({
  teamMember,
  existingTimeOffs,
  onSubmit,
  loading,
  categoryMode,
  workdayBalance,
}: SupervisorTimeOffFormProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  // Filter categories based on categoryMode
  const filteredCategories = useMemo(() => {
    if (categoryMode === 'vacation-only') {
      return categories.filter(
        (c) => c.categoryName.toLowerCase() === VACATION_CATEGORY_NAME.toLowerCase()
      );
    }
    if (categoryMode === 'exclude-vacation') {
      return categories.filter(
        (c) => c.categoryName.toLowerCase() !== VACATION_CATEGORY_NAME.toLowerCase()
      );
    }
    return categories;
  }, [categories, categoryMode]);

  // Auto-select the vacation category when in vacation-only mode
  useEffect(() => {
    if (categoryMode === 'vacation-only' && filteredCategories.length === 1) {
      setValue('categoryId', filteredCategories[0].categoryId.toString());
    }
  }, [categoryMode, filteredCategories, setValue]);

  // Reset comment and split mode when category changes
  useEffect(() => {
    if (categoryId) {
      setValue('comment', '');
      setIsSplitMode(false);
    }
  }, [categoryId, setValue]);

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
    fullDayHolidayDatesForBlocking,
  } = useHolidayAwareness({
    countryIso: teamMember?.countryIso,
    startDate,
    endDate,
    isCalendar,
  });

  const { activeSwaps } = useHolidayContext();

  // Clear end date when start date moves past it (non-fixed categories only)
  useEffect(() => {
    if (startDate && endDate && startDate > endDate && !isFixedDuration) {
      setValue('endDate', undefined);
    }
  }, [startDate, endDate, isFixedDuration, setValue]);

  // Validation: Date range
  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  // Validation: Start date cannot be on weekend
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;

  // Validation: Start date cannot be on a public holiday (swap-aware)
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, fullDayHolidayDatesForBlocking) : false;

  // Swap awareness for start date: detect replacement day (block) vs swapped-away original (advisory)
  const startDateReplacementSwap = useMemo(() => {
    if (!startDate) return null;
    return activeSwaps.find((s) => {
      const rep = parseUTCDateAsLocal(s.replacementDate as string);
      return rep.getFullYear() === startDate.getFullYear() &&
             rep.getMonth() === startDate.getMonth() &&
             rep.getDate() === startDate.getDate();
    }) ?? null;
  }, [startDate, activeSwaps]);

  const startDateSwappedHoliday = useMemo(() => {
    if (!startDate) return null;
    return activeSwaps.find((s) => {
      const orig = parseUTCDateAsLocal(s.originalDate as string);
      return orig.getFullYear() === startDate.getFullYear() &&
             orig.getMonth() === startDate.getMonth() &&
             orig.getDate() === startDate.getDate();
    }) ?? null;
  }, [startDate, activeSwaps]);

  // Validation: Attrition date - check if dates exceed team member's end date
  const exceedsAttritionDate = teamMemberEndDate && (
    (startDate && startDate > teamMemberEndDate) ||
    (endDate && endDate > teamMemberEndDate)
  );

  // Overlap detection
  const overlappingTimeOffs =
    existingTimeOffs && startDate && endDate
      ? detectOverlap(startDate, endDate, existingTimeOffs, cancelledStatusId ?? -1, 6)
      : [];
  const hasOverlap = overlappingTimeOffs.length > 0;

  // El Salvador Vacation validation
  const isSVVacation = isElSalvadorVacation(
    teamMember?.countryIso,
    selectedCategory?.categoryName
  );

  const hintDays = startDate && endDate && isDateRangeValid
    ? calculateRequestedDays(startDate, endDate, isCalendar)
    : 0;

  // The authoritative day count once holidays (including half-days) are excluded.
  const effectiveDays = gtNetVacationDays ?? hintDays;

  const svMemberStartDate = (teamMember?.hireDate ?? teamMember?.teamMemberStartDate)
    ? parseUTCDateAsLocal((teamMember!.hireDate ?? teamMember!.teamMemberStartDate) as unknown as string)
    : null;
  // Anniversary boundary notice — shown when the date range crosses into the next anniversary period
  const startDatePeriod = svMemberStartDate && startDate
    ? computeCurrentPeriod(svMemberStartDate, startDate)
    : null;
  const endDatePeriod = svMemberStartDate && endDate
    ? computeCurrentPeriod(svMemberStartDate, endDate)
    : null;
  const spansAnniversaryBoundary =
    !!isDateRangeValid &&
    startDatePeriod !== null &&
    endDatePeriod !== null &&
    startDatePeriod !== endDatePeriod;

  const isVacation = selectedCategory?.categoryName?.toLowerCase().trim() === 'vacation';

  // SV 15-day mode: applies whenever SV + Vacation
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

  const handleSaveSplit = useCallback(async (periodA: SplitPeriod, periodB: SplitPeriod) => {
    if (!teamMember) return;
    setSubmitting(true);
    try {
      await apiPost('/api/time-offs/supervisor/split', {
        teamMemberId: teamMember.teamMemberId,
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
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create split vacation requests';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [teamMember, categoryId, comment, reset, toast]);

  // Days-before notice period validation — blocks canSave
  const daysBefore = selectedCategory?.categoryCountryDaysBefore ?? 0;
  const daysBeforeValidation = validateDaysBefore(
    startDate,
    daysBefore,
    selectedCategory?.categoryName ?? ''
  );

  // Max days per request validation
  const exceedsMaxDays = maxDays > 0 && effectiveDays > maxDays;

  // Balance validation — for GT vacation, add accrued days (1.25/month since 2025-12-31)
  // Advisory only for supervisors — does not block canSave
  const isGTVacation = teamMember?.countryIso === 'GT' && selectedCategory?.categoryName?.toLowerCase().trim() === 'vacation';
  const gtAccruedDays = isGTVacation && startDate ? computeGTAccruedVacationDays(startDate) : 0;
  const balanceForValidation = workdayBalance && gtAccruedDays > 0
    ? { ...workdayBalance, vacation: workdayBalance.vacation + gtAccruedDays }
    : workdayBalance ?? null;
  const balanceValidation = selectedCategory && effectiveDays > 0 && workdayBalance
    ? validateWorkdayBalance(selectedCategory.categoryName, effectiveDays, balanceForValidation)
    : { valid: true, errorMessage: null, available: 0 };

  const gtPersonalDaysWarning = selectedCategory && effectiveDays > 0 && startDate
    ? validateGTPersonalDays(
        teamMember?.countryIso,
        selectedCategory.categoryName,
        effectiveDays,
        getPersonalDaysUsedInMonth(existingTimeOffs, startDate, cancelledStatusId)
      )
    : null;

  // Save button enabled state
  const canSave =
    teamMember &&
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateWeekend &&
    !isStartDateHoliday &&
    !exceedsMaxDays &&
    !gtPersonalDaysWarning?.showLimitWarning &&
    (daysBeforeValidation?.valid !== false) &&
    !!comment?.trim() &&
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
            Creating request for <span className="font-medium">{teamMember.teamMemberNames} {teamMember.teamMemberSurnames}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
                options={filteredCategories.map((cat): ComboBoxOption => ({
                  value: cat.categoryId.toString(),
                  label: cat.categoryName,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={loadingCategories ? 'Loading...' : 'Select category'}
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found."
                disabled={loadingCategories || categoryMode === 'vacation-only'}
              />
            )}
          />
        </div>

        {/* Date range area — replaced by split mode when active */}
        {isSplitMode && startDate ? (
          <SVVacationSplitMode
            anchorStartDate={startDate}
            countryIso={teamMember.countryIso}
            userEndDate={teamMemberEndDate}
            comment={comment ?? ''}
            submitting={submitting}
            onBack={() => setIsSplitMode(false)}
            onSaveSplit={handleSaveSplit}
          />
        ) : (
          <>
            {/* Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                            if (isDateInHolidayList(date, fullDayHolidayDatesForBlocking)) return true;
                            return false;
                          }}
                          modifiers={{ holiday: holidayDatesForCalendar }}
                          modifiersClassNames={{ holiday: 'bg-uds-system-amber-100 text-uds-system-amber-700 font-medium' }}
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
                            if (teamMemberEndDate && date > teamMemberEndDate) return true;
                            return false;
                          }}
                          modifiers={{ holiday: holidayDatesForCalendar }}
                          modifiersClassNames={{ holiday: 'bg-uds-system-amber-100 text-uds-system-amber-700 font-medium' }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {isSV15DayMode && (
                  <p className="text-sm text-muted-foreground">
                    15 calendar days (auto-set for El Salvador)
                  </p>
                )}
              </div>
            </div>

            {/* Days-Before Notice Period — blocks save */}
            {!daysBeforeValidation.valid && daysBeforeValidation.errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{daysBeforeValidation.errorMessage}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Second Row - Comment */}
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
                placeholder="Add a note..."
                rows={2}
              />
            )}
          />
          {errors.comment && (
            <p className="text-sm text-destructive">{errors.comment.message}</p>
          )}
        </div>

        {/* Validation messages and alerts — hidden in split mode */}
        {!isSplitMode && (
          <>
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
          {isStartDateHoliday && startDateReplacementSwap && (
            <p className="text-destructive">
              This date is a replacement day (swapped from {startDateReplacementSwap.holidayName}). It cannot be used as a start date.
            </p>
          )}
          {isStartDateHoliday && !startDateReplacementSwap && (
            <p className="text-destructive">Start date cannot be on a public holiday</p>
          )}
          {!isStartDateHoliday && startDateSwappedHoliday && (
            <p className="text-muted-foreground">
              Note: {startDateSwappedHoliday.holidayName} on this date was swapped. This is now a working day.
            </p>
          )}
          {isVacation && startDatePeriod && (
            <p className="text-muted-foreground">Anniversary period: {startDatePeriod}</p>
          )}
          {isFixedDuration && fixedDays && (
            <p className="text-muted-foreground">
              Fixed duration: {fixedDays} day{fixedDays !== 1 ? 's' : ''}
            </p>
          )}
          {!isFixedDuration && !isSV15DayMode && effectiveDays > 0 && (
            <p className="text-muted-foreground">
              {effectiveDays} day{effectiveDays !== 1 ? 's' : ''}
            </p>
          )}
          {maxDays > 0 && (
            <p className="text-muted-foreground">
              Max. {maxDays} day{maxDays !== 1 ? 's' : ''} per request
            </p>
          )}
          {exceedsMaxDays && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This request exceeds the maximum of {maxDays} day{maxDays !== 1 ? 's' : ''} per request. You selected {effectiveDays} days.
              </AlertDescription>
            </Alert>
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
              Time off cannot extend beyond {teamMember?.teamMemberNames} {teamMember?.teamMemberSurnames}'s end date ({format(teamMemberEndDate, 'PPP')}).
            </AlertDescription>
          </Alert>
        )}

        {/* Workday Balance Warning (advisory — supervisor is not blocked) */}
        {!balanceValidation.valid && balanceValidation.errorMessage && (
          <Alert variant="warning">
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

        {/* Submit Button — hidden when split mode is active */}
        {!isSplitMode && (
          isSV15DayMode ? (
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!canSave}>
                {loading ? 'Creating...' : 'Create Time Off Request'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!startDate || loading}
                onClick={() => setIsSplitMode(true)}
              >
                Split
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={!canSave}>
              {loading ? 'Creating...' : 'Create Time Off Request'}
            </Button>
          )
        )}
      </form>
    </div>
  );
}
