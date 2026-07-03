import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle, X } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
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
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { detectOverlap } from '../../utils/overlapDetection';
import {
  VACATION_CATEGORY_NAME,
  isElSalvadorVacation,
  calculateCalendarDays,
  computeCurrentPeriod,
  getExistingVacationDaysThisYear,
  validateSVVacation,
} from '../../utils/elSalvadorVacationValidation';
import { validateDaysBefore } from '../../utils/daysBefore';
import { isDateInHolidayList } from '../../utils/holidayValidation';
import { SVVacationSplitMode, type SplitPeriod } from '../../components/SVVacationSplitMode';
import { validateWorkdayBalance, computeGTAccruedVacationDays } from '../../utils/workdayBalanceValidation';

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
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

interface SupervisorMemberFormProps {
  teamMember: SupervisedTeamMemberDTO;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  editingTimeOff: TimeOffWithDetailsDTO | null;
  onCancelEdit: () => void;
  onCreate: (data: CreateSupervisorTimeOffDTO) => Promise<void>;
  onUpdate: (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => Promise<void>;
  loading: boolean;
  workdayBalance: { vacation: number; personalDays: number } | null;
}

export function SupervisorMemberForm(props: SupervisorMemberFormProps) {
  return (
    <HolidayProvider countryId={props.teamMember.countryId} countryIso={props.teamMember.countryIso}>
      <SupervisorMemberFormInner {...props} />
    </HolidayProvider>
  );
}

function SupervisorMemberFormInner({
  teamMember,
  existingTimeOffs,
  editingTimeOff,
  onCancelEdit,
  onCreate,
  onUpdate,
  loading,
  workdayBalance,
}: SupervisorMemberFormProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [submittingSplit, setSubmittingSplit] = useState(false);
  const { toast } = useToast();

  const isEditing = editingTimeOff !== null;
  const isEditingSplit = isEditing && editingTimeOff.statusName.toLowerCase() === 'split';

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { categoryId: '', startDate: undefined, endDate: undefined, comment: '' },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const categoryId = watch('categoryId');
  const comment = watch('comment');

  const selectedCategory = categories.find((c) => c.categoryId.toString() === categoryId);
  const isFixedDuration = selectedCategory?.categoryCountryIsFixedDuration ?? false;
  const fixedDays = selectedCategory?.categoryCountryFixedDays ?? null;
  const isCalendar = selectedCategory?.categoryCountryIsCalendar ?? false;
  const maxDays = selectedCategory?.categoryCountryMaxDays ?? 0;

  const teamMemberEndDate = teamMember.teamMemberEndDate
    ? parseUTCDateAsLocal(teamMember.teamMemberEndDate as unknown as string)
    : null;

  // Load categories
  useEffect(() => {
    async function loadData() {
      if (!teamMember.teamMemberId) return;
      try {
        setLoadingCategories(true);
        const categoriesData = await apiGet<CategoryByCountryDTO[]>(
          `/api/time-off-category/team-member/${teamMember.teamMemberId}`
        );
        setCategories(categoriesData);
        const statusesData = await apiGet<TimeOffStatus[]>('/api/time-off-statuses');
        const cancelled = statusesData.find((s) => s.statusName.toLowerCase().trim() === 'cancelled');
        if (cancelled) setCancelledStatusId(cancelled.statusId);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load form data';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingCategories(false);
      }
    }
    loadData();
  }, [teamMember.teamMemberId, toast]);

  // Populate form when entering edit mode, reset when leaving
  useEffect(() => {
    if (editingTimeOff) {
      reset({
        categoryId: editingTimeOff.categoryId?.toString() ?? '',
        startDate: parseUTCDateAsLocal(editingTimeOff.timeOffStartDate as unknown as string),
        endDate: parseUTCDateAsLocal(editingTimeOff.timeOffEndDate as unknown as string),
        comment: '',
      });
      setIsSplitMode(false);
    } else {
      reset({ categoryId: '', startDate: undefined, endDate: undefined, comment: '' });
      setIsSplitMode(false);
    }
  }, [editingTimeOff, reset]);

  // Reset split mode when category changes (create mode only)
  useEffect(() => {
    if (!isEditing && categoryId) setIsSplitMode(false);
  }, [categoryId, isEditing]);

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

  const { svHolidaysInRange, gtWeekdayHolidaysInRange, gtNetVacationDays, holidayDatesForCalendar } =
    useHolidayAwareness({ countryIso: teamMember.countryIso, startDate, endDate, categoryName: selectedCategory?.categoryName });

  const { activeSwaps } = useHolidayContext();

  useEffect(() => {
    if (startDate && endDate && startDate > endDate && !isFixedDuration) {
      setValue('endDate', undefined);
    }
  }, [startDate, endDate, isFixedDuration, setValue]);

  // SV 15-day auto-end
  const isSVVacation = isElSalvadorVacation(teamMember.countryIso, selectedCategory?.categoryName);
  const isSV15DayMode = isSVVacation;

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

  const isDateRangeValid = startDate && endDate && startDate <= endDate;
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, holidayDatesForCalendar) : false;

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

  const exceedsAttritionDate = teamMemberEndDate && (
    (startDate && startDate > teamMemberEndDate) ||
    (endDate && endDate > teamMemberEndDate)
  );

  const overlappingTimeOffs = existingTimeOffs && startDate && endDate
    ? detectOverlap(startDate, endDate, existingTimeOffs.filter((t) => t.timeOffId !== editingTimeOff?.timeOffId), cancelledStatusId ?? -1)
    : [];
  const hasOverlap = overlappingTimeOffs.length > 0;

  const requestedDays = startDate && endDate ? calculateCalendarDays(startDate, endDate) : 0;
  const hintDays = startDate && endDate && isDateRangeValid ? calculateRequestedDays(startDate, endDate, isCalendar) : 0;

  const svMemberStartDate = (teamMember.hireDate ?? teamMember.teamMemberStartDate)
    ? parseUTCDateAsLocal(((teamMember.hireDate ?? teamMember.teamMemberStartDate) as unknown) as string)
    : null;
  const currentPeriod = isSVVacation ? computeCurrentPeriod(svMemberStartDate, startDate ?? undefined) : null;
  const existingVacationDays = isSVVacation
    ? getExistingVacationDaysThisYear(existingTimeOffs, cancelledStatusId ?? 4, currentPeriod)
    : 0;
  const svValidation = isSVVacation && requestedDays > 0
    ? validateSVVacation(requestedDays, existingVacationDays, undefined, svMemberStartDate)
    : { valid: true, errorMessage: null, allowedDayOptions: [], existingDays: 0, nextAnniversaryDate: null };

  const startDatePeriod = svMemberStartDate && startDate ? computeCurrentPeriod(svMemberStartDate, startDate) : null;
  const endDatePeriod = svMemberStartDate && endDate ? computeCurrentPeriod(svMemberStartDate, endDate) : null;
  const spansAnniversaryBoundary =
    !!isDateRangeValid && startDatePeriod !== null && endDatePeriod !== null && startDatePeriod !== endDatePeriod;

  const daysBefore = selectedCategory?.categoryCountryDaysBefore ?? 0;
  const daysBeforeValidation = validateDaysBefore(startDate, daysBefore, selectedCategory?.categoryName ?? '');
  const exceedsMaxDays = maxDays > 0 && hintDays > maxDays;

  const isGTVacation = teamMember.countryIso === 'GT' && selectedCategory?.categoryName?.toLowerCase().trim() === 'vacation';
  const gtAccruedDays = isGTVacation && startDate ? computeGTAccruedVacationDays(startDate) : 0;
  const balanceForValidation = workdayBalance && gtAccruedDays > 0
    ? { ...workdayBalance, vacation: workdayBalance.vacation + gtAccruedDays }
    : workdayBalance ?? null;
  const balanceValidation = selectedCategory && hintDays > 0 && workdayBalance
    ? validateWorkdayBalance(selectedCategory.categoryName, hintDays, balanceForValidation)
    : { valid: true, errorMessage: null, available: 0 };

  const canSave =
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateWeekend &&
    !isStartDateHoliday &&
    svValidation.valid &&
    !exceedsMaxDays &&
    daysBeforeValidation?.valid !== false &&
    !!comment?.trim() &&
    !loading;

  const handleSaveSplit = useCallback(async (periodA: SplitPeriod, periodB: SplitPeriod) => {
    setSubmittingSplit(true);
    try {
      await apiPost('/api/time-offs/supervisor/split', {
        teamMemberId: teamMember.teamMemberId,
        categoryId: Number(categoryId),
        periodA: { startDate: periodA.startDate.toISOString(), endDate: periodA.endDate.toISOString() },
        periodB: { startDate: periodB.startDate.toISOString(), endDate: periodB.endDate.toISOString() },
        comment,
      });
      toast({ title: 'Success', description: 'Split vacation requests created successfully' });
      reset();
      setIsSplitMode(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create split requests';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmittingSplit(false);
    }
  }, [teamMember.teamMemberId, categoryId, comment, reset, toast]);

  const handleFormSubmit = useCallback(async (data: FormData) => {
    if (!data.startDate || !data.endDate) return;
    if (isEditing) {
      await onUpdate(editingTimeOff.timeOffId, {
        categoryId: Number(data.categoryId),
        timeOffStartDate: data.startDate.toISOString(),
        timeOffEndDate: data.endDate.toISOString(),
        comment: data.comment || undefined,
      });
    } else {
      await onCreate({
        teamMemberId: teamMember.teamMemberId,
        categoryId: Number(data.categoryId),
        timeOffStartDate: data.startDate.toISOString(),
        timeOffEndDate: data.endDate.toISOString(),
        comment: data.comment || undefined,
      });
      reset();
    }
  }, [isEditing, editingTimeOff, onCreate, onUpdate, teamMember.teamMemberId, reset]);

  const formCard = (
    <div className={cn(
      'bg-card rounded-lg border p-6',
      isEditing && 'border-2 border-amber-400',
      isEditingSplit && 'border-2 border-violet-400',
    )}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing
              ? `Editing Time-Off #${editingTimeOff.timeOffId}${isEditingSplit ? ' (Split)' : ''}`
              : 'New Time-Off Request'}
          </h3>
          {isEditing && (
            <p className="text-sm text-muted-foreground">
              {isEditingSplit ? 'This is part of a split vacation request.' : 'Modifying an existing request.'}
            </p>
          )}
        </div>
        {isEditing && (
          <Button variant="outline" size="sm" onClick={onCancelEdit}>
            <X className="h-3 w-3 mr-1" /> Cancel edit
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category <span className="text-destructive">*</span></Label>
          <Controller
            name="categoryId"
            control={control}
            rules={{ required: 'Category is required' }}
            render={({ field }) => (
              <ComboBox
                options={categories.map((c): ComboBoxOption => ({ value: c.categoryId.toString(), label: c.categoryName }))}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={loadingCategories ? 'Loading...' : 'Select category'}
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found."
                disabled={loadingCategories}
              />
            )}
          />
          {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
        </div>

        {/* Date area — replaced by split mode when active */}
        {isSplitMode && startDate ? (
          <SVVacationSplitMode
            anchorStartDate={startDate}
            countryIso={teamMember.countryIso}
            userEndDate={teamMemberEndDate}
            comment={comment ?? ''}
            submitting={submittingSplit}
            onBack={() => setIsSplitMode(false)}
            onSaveSplit={handleSaveSplit}
            layout="columns"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Controller
                  name="startDate"
                  control={control}
                  rules={{ required: 'Start date is required' }}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
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
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <Controller
                  name="endDate"
                  control={control}
                  rules={{ required: 'End date is required' }}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
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
                          modifiersClassNames={{ holiday: 'bg-amber-100 text-amber-800 font-medium' }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {isSV15DayMode && <p className="text-sm text-muted-foreground">15 calendar days (auto-set for El Salvador)</p>}
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>

            {!daysBeforeValidation.valid && daysBeforeValidation.errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{daysBeforeValidation.errorMessage}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Comment */}
        <div className="space-y-2">
          <Label>Comment <span className="text-destructive">*</span></Label>
          <Controller
            name="comment"
            control={control}
            rules={{ required: 'Comment is required' }}
            render={({ field }) => (
              <Textarea {...field} placeholder="Add a note..." rows={2} />
            )}
          />
          {errors.comment && <p className="text-sm text-destructive">{errors.comment.message}</p>}
        </div>

        {/* Validation messages — hidden in split mode */}
        {!isSplitMode && (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              {startDate && endDate && !isDateRangeValid && <p className="text-destructive">End date must be on or after start date</p>}
              {isStartDateWeekend && <p className="text-destructive">Start date cannot be on a weekend</p>}
              {isStartDateHoliday && startDateReplacementSwap && (
                <p className="text-destructive">This date is a replacement day (swapped from {startDateReplacementSwap.holidayName}). It cannot be used as a start date.</p>
              )}
              {isStartDateHoliday && !startDateReplacementSwap && <p className="text-destructive">Start date cannot be on a public holiday</p>}
              {!isStartDateHoliday && startDateSwappedHoliday && (
                <p className="text-muted-foreground">Note: {startDateSwappedHoliday.holidayName} on this date was swapped. This is now a working day.</p>
              )}
              {isFixedDuration && fixedDays && <p className="text-muted-foreground">Fixed duration: {fixedDays} day{fixedDays !== 1 ? 's' : ''}</p>}
              {!isFixedDuration && !isSV15DayMode && hintDays > 0 && <p className="text-muted-foreground">{hintDays} day{hintDays !== 1 ? 's' : ''}</p>}
              {maxDays > 0 && <p className="text-muted-foreground">Max. {maxDays} day{maxDays !== 1 ? 's' : ''} per request</p>}
              {exceedsMaxDays && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>This request exceeds the maximum of {maxDays} day{maxDays !== 1 ? 's' : ''} per request. You selected {hintDays} days.</AlertDescription>
                </Alert>
              )}
            </div>

            {svHolidaysInRange.length > 0 && (
              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">Your request includes public holidays counted as vacation days:</p>
                  <ul className="list-disc list-inside text-sm">
                    {svHolidaysInRange.map(({ holiday, effectiveDate }) => (
                      <li key={holiday.holidayId}>{holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}{holiday.holidayIsHalfDay && ' (half day)'}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {gtWeekdayHolidaysInRange.length > 0 && gtNetVacationDays !== null && (
              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">Public holidays not counted as vacation days:</p>
                  <ul className="list-disc list-inside text-sm mb-2">
                    {gtWeekdayHolidaysInRange.map(({ holiday, effectiveDate }) => (
                      <li key={holiday.holidayId}>{holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium">Net vacation days: <strong>{gtNetVacationDays} day{gtNetVacationDays !== 1 ? 's' : ''}</strong></p>
                </AlertDescription>
              </Alert>
            )}

            {spansAnniversaryBoundary && (
              <Alert>
                <AlertDescription>This request spans two anniversary periods ({startDatePeriod} → {endDatePeriod}). Days from each period will be tracked separately.</AlertDescription>
              </Alert>
            )}

            {hasOverlap && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">This request overlaps with {overlappingTimeOffs.length} existing time off{overlappingTimeOffs.length > 1 ? 's' : ''}:</p>
                  <ul className="list-disc list-inside text-sm mb-3">
                    {overlappingTimeOffs.map((to) => (
                      <li key={to.timeOffId}>{to.categoryName}: {formatUTCDate(to.timeOffStartDate as unknown as string, 'MMM dd')} – {formatUTCDate(to.timeOffEndDate as unknown as string, 'MMM dd, yyyy')}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {exceedsAttritionDate && teamMemberEndDate && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Time off cannot extend beyond {teamMember.teamMemberNames} {teamMember.teamMemberSurnames}'s end date ({format(teamMemberEndDate, 'PPP')}).</AlertDescription>
              </Alert>
            )}

            {isSVVacation && (
              <Alert variant={svValidation.valid ? 'info' : 'destructive'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">El Salvador Vacation Policy</p>
                  <p className="text-sm mb-2">Vacation days used this year: <span className="font-medium">{existingVacationDays}</span> of 15 days</p>
                  {requestedDays > 0 && <p className="text-sm mb-2">Current request: <span className="font-medium">{requestedDays} days</span></p>}
                  {svValidation.errorMessage && (
                    <p className="text-sm font-medium mt-2">
                      {svValidation.errorMessage}
                      {svValidation.nextAnniversaryDate && (
                        <> You will be able to request vacation again from <span className="font-medium">{formatUTCDate(svValidation.nextAnniversaryDate.toISOString(), 'dd-MMM-yyyy')}</span>.</>
                      )}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!balanceValidation.valid && balanceValidation.errorMessage && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{balanceValidation.errorMessage}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Submit — hidden in split mode */}
        {!isSplitMode && (
          isSV15DayMode && !isEditing ? (
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!canSave}>
                {loading ? 'Creating...' : 'Create Time Off Request'}
              </Button>
              <Button type="button" variant="outline" className="flex-1" disabled={!startDate || loading} onClick={() => setIsSplitMode(true)}>
                Split
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={!canSave}>
              {loading
                ? isEditing ? 'Saving...' : 'Creating...'
                : isEditing ? 'Save Changes' : 'Create Time Off Request'}
            </Button>
          )
        )}
      </form>
    </div>
  );

  // Split mode: full width so both period cards have room
  if (isSplitMode) return formCard;

  // Create mode (no split): centered at ~50% width
  if (!isEditing) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">{formCard}</div>
      </div>
    );
  }

  // Edit mode: full width with amber/violet border
  return formCard;
}
