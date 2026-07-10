import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { CalendarIcon, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { TimeOffWithDetailsDTO, UpdateMyTimeOffDTO } from '@shared/dto/TimeOff';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, parseUTCDateAsLocal, formatUTCDate } from '@/lib/utils';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useMyWorkdayBalance } from '@/hooks/useMyWorkdayBalance';
import { HolidayProvider } from '../context/HolidayContext';
import { SVVacationSplitMode, type SplitPeriod } from '../components/SVVacationSplitMode';
import { SiblingReadOnlyCard } from './SiblingReadOnlyCard';
import { detectOverlap } from '../utils/overlapDetection';
import { isElSalvadorVacation } from '../utils/elSalvadorVacationValidation';
import { validateDaysBefore } from '../utils/daysBefore';
import { isDateInHolidayList } from '../utils/holidayValidation';
import { validateWorkdayBalance, computeGTAccruedVacationDays } from '../utils/workdayBalanceValidation';
import { computeCurrentPeriod } from '../utils/anniversaryWindow';
import { calculateFixedDurationEndDate, calculateRequestedDays } from '../utils/fixedDurationEndDate';
import { useHolidayAwareness } from '../hooks/useHolidayAwareness';

const SPLIT_STATUS_ID = 6;

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

// Outer shell: loads profile so HolidayProvider has country info before the form renders.
// The inner component calls useHolidayAwareness (which needs useHolidayContext), so it must
// be a child of HolidayProvider — not the same component that renders the provider.
export function EditTimeOffPage() {
  const { timeOffId: timeOffIdParam } = useParams<{ timeOffId: string }>();
  const timeOffId = timeOffIdParam ? Number(timeOffIdParam) : null;

  const [countryId, setCountryId] = useState<number | null>(null);
  const [countryIso, setCountryIso] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyTeamMemberProfile | null>(null);

  useEffect(() => {
    apiGet<MyTeamMemberProfile>('/api/team-members/me')
      .then((p) => {
        setProfile(p);
        setCountryId(p.countryId);
        setCountryIso(p.countryIso);
      })
      .catch(() => {});
  }, []);

  return (
    <HolidayProvider countryId={countryId} countryIso={countryIso}>
      <EditTimeOffPageInner timeOffId={timeOffId} profile={profile} />
    </HolidayProvider>
  );
}

export function EditTimeOffPageInner({
  timeOffId,
  profile,
  isModal = false,
  onClose,
}: {
  timeOffId: number | null;
  profile: MyTeamMemberProfile | null;
  isModal?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allTimeOffs, setAllTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);
  const [userEndDate, setUserEndDate] = useState<Date | null>(null);
  const [userCountryIso, setUserCountryIso] = useState<string | null>(null);
  const [userCountryId, setUserCountryId] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);

  const { balance } = useMyWorkdayBalance();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { categoryId: '', startDate: undefined, endDate: undefined, comment: '' },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const categoryId = watch('categoryId');
  const comment = watch('comment');

  const editingTimeOff = allTimeOffs.find((t) => t.timeOffId === timeOffId) ?? null;

  const sibling = editingTimeOff?.timeOffOriginalId
    ? allTimeOffs.find(
        (t) =>
          t.timeOffOriginalId === editingTimeOff.timeOffOriginalId &&
          t.timeOffId !== editingTimeOff.timeOffId
      ) ?? null
    : null;

  const selectedCategory = categories.find((cat) => cat.categoryId.toString() === categoryId);
  const isFixedDuration = selectedCategory?.categoryCountryIsFixedDuration ?? false;
  const fixedDays = selectedCategory?.categoryCountryFixedDays ?? null;
  const isCalendar = selectedCategory?.categoryCountryIsCalendar ?? false;

  const isSVVacation = isElSalvadorVacation(userCountryIso, selectedCategory?.categoryName);
  const isHalfOfSplit =
    editingTimeOff?.timeOffOriginalId !== null &&
    editingTimeOff?.timeOffOriginalId !== undefined;

  // SV 15-day mode: SV vacation, not a split child, not already a split origin
  const isSV15DayMode =
    isSVVacation && !isHalfOfSplit && editingTimeOff?.statusId !== SPLIT_STATUS_ID;

  const { svHolidaysInRange, gtNetVacationDays, holidayDatesForCalendar, fullDayHolidayDatesForBlocking } = useHolidayAwareness({
    countryIso: userCountryIso,
    startDate,
    endDate,
    isCalendar,
  });

  // Initialize country/end-date from the profile loaded by the outer shell
  useEffect(() => {
    if (!profile) return;
    if (profile.teamMemberEndDate) setUserEndDate(parseUTCDateAsLocal(profile.teamMemberEndDate));
    setUserCountryIso(profile.countryIso);
    setUserCountryId(profile.countryId);
  }, [profile]);

  useEffect(() => {
    if (!timeOffId) return;

    async function loadAll() {
      try {
        const [timeOffsData, categoriesData, statusesData] = await Promise.all([
          apiGet<TimeOffWithDetailsDTO[]>('/api/time-offs/my-requests'),
          apiGet<CategoryByCountryDTO[]>('/api/time-off-category/my-categories'),
          apiGet<TimeOffStatus[]>('/api/time-off-statuses'),
        ]);

        setAllTimeOffs(timeOffsData);
        setCategories(categoriesData);

        const cancelled = statusesData.find((s) => s.statusName.toLowerCase().trim() === 'cancelled');
        if (cancelled) setCancelledStatusId(cancelled.statusId);

        const target = timeOffsData.find((t) => t.timeOffId === timeOffId);
        if (target) {
          reset({
            categoryId: target.categoryId?.toString() ?? '',
            startDate: parseUTCDateAsLocal(String(target.timeOffStartDate)),
            endDate: parseUTCDateAsLocal(String(target.timeOffEndDate)),
            comment: '',
          });
        }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load data';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingData(false);
      }
    }

    loadAll();
  }, [timeOffId, reset, toast]);

  // Auto-calculate end date for fixed-duration categories
  useEffect(() => {
    if (isFixedDuration && fixedDays && startDate) {
      const calculated = calculateFixedDurationEndDate(startDate, fixedDays, isCalendar);
      if (!endDate || endDate.getTime() !== calculated.getTime()) {
        setValue('endDate', calculated);
      }
    }
  }, [isFixedDuration, fixedDays, isCalendar, startDate, endDate, setValue]);

  // Auto-set end date for SV 15-day mode
  useEffect(() => {
    if (!isSV15DayMode || !startDate) return;
    const sv15End = addDays(startDate, 14);
    if (!endDate || endDate.getTime() !== sv15End.getTime()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue('endDate' as any, sv15End as any);
    }
  }, [isSV15DayMode, startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set end date when editing one half of a split vacation.
  // Days count is fixed by the split constraint: allowedDays = total - sibling.days.
  // Since total = editingTimeOff.timeOffDays + sibling.timeOffDays, and sibling is read-only,
  // this half must keep exactly its original day count.
  useEffect(() => {
    if (!isHalfOfSplit || !startDate || !editingTimeOff) return;
    const allowedDays = Number(editingTimeOff.timeOffDays);
    const splitEnd = addDays(startDate, allowedDays - 1);
    if (!endDate || endDate.getTime() !== splitEnd.getTime()) {
      setValue('endDate', splitEnd);
    }
  }, [isHalfOfSplit, startDate, editingTimeOff?.timeOffDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDateRangeValid = startDate && endDate && startDate <= endDate;
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, fullDayHolidayDatesForBlocking) : false;
  const exceedsAttritionDate =
    userEndDate && ((startDate && startDate > userEndDate) || (endDate && endDate > userEndDate));

  const otherTimeOffs = allTimeOffs.filter((t) => t.timeOffId !== timeOffId);
  const overlappingTimeOffs =
    startDate && endDate
      ? detectOverlap(startDate, endDate, otherTimeOffs, cancelledStatusId ?? -1, 6)
      : [];
  const hasOverlap = overlappingTimeOffs.length > 0;

  const hintDays =
    startDate && endDate && isDateRangeValid
      ? calculateRequestedDays(startDate, endDate, isCalendar)
      : 0;
  // The authoritative day count once holidays (including half-days) are excluded.
  const effectiveDays = gtNetVacationDays ?? hintDays;

  const daysBefore = selectedCategory?.categoryCountryDaysBefore ?? 0;
  const daysBeforeValidation = validateDaysBefore(
    startDate,
    daysBefore,
    selectedCategory?.categoryName ?? ''
  );

  const categoryNameLower = selectedCategory?.categoryName?.toLowerCase().trim();
  const isVacationCategory = categoryNameLower === 'vacation';
  const memberStartDateStr = profile?.hireDate ?? profile?.teamMemberStartDate ?? null;
  const userMemberStartDate = memberStartDateStr ? parseUTCDateAsLocal(memberStartDateStr) : null;
  const startDatePeriod = userMemberStartDate && startDate
    ? computeCurrentPeriod(userMemberStartDate, startDate)
    : null;
  const isPersonalDayCategory =
    categoryNameLower === 'personal day' || categoryNameLower === 'personal days';
  const oldRequestDays = editingTimeOff?.timeOffDays ?? 0;
  const isGTVacation = userCountryIso === 'GT' && isVacationCategory;
  const gtAccruedDays = isGTVacation && startDate ? computeGTAccruedVacationDays(startDate) : 0;
  const effectiveBalance = balance
    ? {
        vacation: balance.vacation + (isVacationCategory ? Number(oldRequestDays) : 0) + gtAccruedDays,
        personalDays: balance.personalDays + (isPersonalDayCategory ? Number(oldRequestDays) : 0),
        personalDaysUsedThisMonth: balance.personalDaysUsedThisMonth,
      }
    : null;
  const balanceValidation =
    selectedCategory && effectiveDays > 0
      ? validateWorkdayBalance(selectedCategory.categoryName, effectiveDays, effectiveBalance)
      : { valid: true, errorMessage: null, available: 0 };

  const canSave =
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    isDateRangeValid &&
    !hasOverlap &&
    !exceedsAttritionDate &&
    !isStartDateHoliday &&
    daysBeforeValidation.valid &&
    balanceValidation.valid &&
    (!isHalfOfSplit || !editingTimeOff || hintDays === Number(editingTimeOff.timeOffDays)) &&
    !!comment?.trim() &&
    !submitting;

  const handleSaveEdit = useCallback(
    async (data: FormData) => {
      if (!timeOffId || !data.startDate || !data.endDate) return;
      setSubmitting(true);
      try {
        const payload: UpdateMyTimeOffDTO = {
          categoryId: Number(data.categoryId),
          timeOffStartDate: data.startDate.toISOString(),
          timeOffEndDate: data.endDate.toISOString(),
          comment: data.comment || undefined,
        };
        await apiPatch(`/api/time-offs/my-requests/${timeOffId}`, payload);
        toast({ title: 'Success', description: 'Time off updated successfully' });
        if (isModal) { onClose?.(); } else { navigate('/my-time-off'); }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to update time off';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setSubmitting(false);
      }
    },
    [timeOffId, navigate, toast]
  );

  const handleConvertToSplit = useCallback(
    async (periodA: SplitPeriod, periodB: SplitPeriod) => {
      if (!timeOffId) return;
      setSubmitting(true);
      try {
        await apiPost(`/api/time-offs/my-requests/${timeOffId}/convert-to-split`, {
          periodA: {
            startDate: periodA.startDate.toISOString(),
            endDate: periodA.endDate.toISOString(),
          },
          periodB: {
            startDate: periodB.startDate.toISOString(),
            endDate: periodB.endDate.toISOString(),
          },
          comment: comment || 'SV vacation split via edit',
        });
        toast({ title: 'Success', description: 'Vacation split into two periods successfully' });
        if (isModal) { onClose?.(); } else { navigate('/my-time-off'); }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to convert to split';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setSubmitting(false);
      }
    },
    [timeOffId, comment, navigate, toast]
  );

  if (loadingData) {
    return (
      <div className="container">
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!editingTimeOff) {
    return (
      <div className={isModal ? 'mt-4' : 'container mt-6'}>
        <p className="text-muted-foreground">Time-off record not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => isModal ? onClose?.() : navigate('/my-time-off')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Time Off
        </Button>
      </div>
    );
  }

  // After the null guard, editingTimeOff is known non-null for the rest of the render
  const siblingLabel =
    sibling &&
    parseUTCDateAsLocal(String(sibling.timeOffStartDate)) <
      parseUTCDateAsLocal(String(editingTimeOff.timeOffStartDate))
      ? 'Period 1'
      : 'Period 2';

  const editingLabel =
    sibling &&
    parseUTCDateAsLocal(String(editingTimeOff.timeOffStartDate)) <
      parseUTCDateAsLocal(String(sibling.timeOffStartDate))
      ? 'Period 1'
      : 'Period 2';

  const formBody = (
    <div className="space-y-4">
      {!isModal && (
        <button
          type="button"
          onClick={() => navigate('/my-time-off')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Time Off
        </button>
      )}

        {sibling && <SiblingReadOnlyCard sibling={sibling} label={siblingLabel} />}

        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isHalfOfSplit ? `Edit ${editingLabel}` : 'Edit Time Off Request'}
          </h3>

          <form onSubmit={handleSubmit(handleSaveEdit)} className="space-y-4">
            {isSplitMode && startDate ? (
              <SVVacationSplitMode
                anchorStartDate={startDate}
                countryIso={userCountryIso}
                userEndDate={userEndDate}
                comment={comment ?? ''}
                submitting={submitting}
                onBack={() => setIsSplitMode(false)}
                onSaveSplit={handleConvertToSplit}
              />
            ) : (
              <>
                {/* Row: Type | Start Date | End Date */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Type (Category) */}
                  <div className="space-y-2">
                    <Label>
                      Type <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="categoryId"
                      control={control}
                      rules={{ required: 'Type is required' }}
                      render={({ field }) => (
                        <ComboBox
                          options={categories.map((cat): ComboBoxOption => ({
                            value: cat.categoryId.toString(),
                            label: cat.categoryName,
                          }))}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select type"
                          searchPlaceholder="Search..."
                          emptyMessage="No categories found."
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
                                if (userEndDate && date > userEndDate) return true;
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
                    {errors.startDate && (
                      <p className="text-sm text-destructive">{errors.startDate.message}</p>
                    )}
                    {isStartDateHoliday && (
                      <p className="text-sm text-destructive">Start date cannot be on a public holiday</p>
                    )}
                    {isVacationCategory && startDatePeriod && (
                      <p className="text-sm text-muted-foreground">Anniversary period: {startDatePeriod}</p>
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
                              disabled={isFixedDuration || isSV15DayMode || isHalfOfSplit}
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
                              defaultMonth={field.value ?? startDate ?? new Date()}
                              disabled={(date) => {
                                if (startDate && date < startDate) return true;
                                if (userEndDate && date > userEndDate) return true;
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
                    {isHalfOfSplit && editingTimeOff && (
                      <p className="text-sm text-muted-foreground">
                        {Number(editingTimeOff.timeOffDays)} calendar days (fixed by split)
                      </p>
                    )}
                    {!isFixedDuration && !isSV15DayMode && !isHalfOfSplit && effectiveDays > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {effectiveDays} day{effectiveDays !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Full-width alerts */}
                {!daysBeforeValidation.valid && daysBeforeValidation.errorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{daysBeforeValidation.errorMessage}</AlertDescription>
                  </Alert>
                )}

                {svHolidaysInRange.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        Your request includes the following public holiday(s). These days will be
                        counted as vacation days.
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

                {hasOverlap && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        This date range overlaps with {overlappingTimeOffs.length} existing time
                        off{overlappingTimeOffs.length > 1 ? 's' : ''}:
                      </p>
                      <ul className="list-disc list-inside text-sm mb-3">
                        {overlappingTimeOffs.map((t) => (
                          <li key={t.timeOffId}>
                            {t.categoryName}: {formatUTCDate(t.timeOffStartDate, 'MMM dd')} –{' '}
                            {formatUTCDate(t.timeOffEndDate, 'MMM dd, yyyy')}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {exceedsAttritionDate && userEndDate && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Time off cannot extend beyond your end date ({format(userEndDate, 'PPP')}).
                    </AlertDescription>
                  </Alert>
                )}

                {!balanceValidation.valid && balanceValidation.errorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{balanceValidation.errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Buttons */}
                {isSV15DayMode ? (
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!canSave}>
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={!startDate || submitting}
                      onClick={() => setIsSplitMode(true)}
                    >
                      Split into Two Periods
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" className="w-full" disabled={!canSave}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </>
            )}

            {/* Comment — shown in both normal and split mode */}
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
                    placeholder="Add a note about this change..."
                    rows={2}
                  />
                )}
              />
              {errors.comment && (
                <p className="text-sm text-destructive">{errors.comment.message}</p>
              )}
            </div>
          </form>
        </div>
      </div>
  );

  if (isModal) return formBody;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Edit Time Off</ToolbarPageTitle>
          <ToolbarDescription>
            {isHalfOfSplit
              ? `Editing ${editingLabel} of a split vacation`
              : 'Update your time off request'}
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>
      <div className="mt-6">
        {formBody}
      </div>
    </div>
  );
}
