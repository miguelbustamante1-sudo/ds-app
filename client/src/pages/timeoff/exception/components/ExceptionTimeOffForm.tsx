import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { CategoryByCountryDTO } from '@shared/dto/TimeOffCategory';
import { useTimeOffFormDates } from '@/hooks/useTimeOffFormDates';
import { calculateRequestedDays } from '../../utils/fixedDurationEndDate';
import { useHolidayAwareness } from '../../hooks/useHolidayAwareness';
import { HolidayProvider } from '../../context/HolidayContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, parseUTCDateAsLocal, formatUTCDate } from '@/lib/utils';
import { apiGet, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { VACATION_CATEGORY_NAME } from '../../utils/elSalvadorVacationValidation';
import { isDateInHolidayList } from '../../utils/holidayValidation';

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

interface ExceptionTimeOffFormProps {
  teamMember: SupervisedTeamMemberDTO | null;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onSubmit: (data: CreateSupervisorTimeOffDTO) => Promise<void>;
  loading: boolean;
}

export function ExceptionTimeOffForm(props: ExceptionTimeOffFormProps) {
  return (
    <HolidayProvider countryId={props.teamMember?.countryId} countryIso={props.teamMember?.countryIso}>
      <ExceptionTimeOffFormInner {...props} />
    </HolidayProvider>
  );
}

function ExceptionTimeOffFormInner({
  teamMember,
  existingTimeOffs: _existingTimeOffs,
  onSubmit,
  loading,
}: ExceptionTimeOffFormProps) {
  const [categories, setCategories] = useState<CategoryByCountryDTO[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
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

  const selectedCategory = categories.find(
    (cat) => cat.categoryId.toString() === categoryId
  );
  const isFixedDuration = selectedCategory?.categoryCountryIsFixedDuration ?? false;
  const fixedDays = selectedCategory?.categoryCountryFixedDays ?? null;
  const isCalendar = selectedCategory?.categoryCountryIsCalendar ?? false;

  const teamMemberEndDate = teamMember?.teamMemberEndDate
    ? parseUTCDateAsLocal(teamMember.teamMemberEndDate)
    : null;

  useEffect(() => {
    reset({ categoryId: '', startDate: undefined, endDate: undefined, comment: '' });
  }, [teamMember?.teamMemberId, reset]);

  useEffect(() => {
    async function loadData() {
      if (!teamMember?.teamMemberId) return;
      try {
        setLoadingCategories(true);
        const categoriesData = await apiGet<CategoryByCountryDTO[]>(
          `/api/time-off-category/team-member/${teamMember.teamMemberId}`
        );
        // Exclude vacation category — handled by the regular supervisor form
        setCategories(
          categoriesData.filter(
            (c) => c.categoryName.toLowerCase() !== VACATION_CATEGORY_NAME.toLowerCase()
          )
        );
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load form data';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingCategories(false);
      }
    }
    loadData();
  }, [teamMember?.teamMemberId, toast]);

  useEffect(() => {
    if (categoryId) setValue('comment', '');
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

  const { holidayDatesForCalendar } = useHolidayAwareness({
    countryIso: teamMember?.countryIso,
    startDate,
    endDate,
    categoryName: selectedCategory?.categoryName,
  });

  useEffect(() => {
    if (startDate && endDate && startDate > endDate && !isFixedDuration) {
      setValue('endDate', undefined);
    }
  }, [startDate, endDate, isFixedDuration, setValue]);

  const isDateRangeValid = startDate && endDate && startDate <= endDate;
  const isStartDateWeekend = startDate ? isWeekend(startDate) : false;
  const isStartDateHoliday = startDate ? isDateInHolidayList(startDate, holidayDatesForCalendar) : false;
  const exceedsAttritionDate = teamMemberEndDate && (
    (startDate && startDate > teamMemberEndDate) ||
    (endDate && endDate > teamMemberEndDate)
  );

  const hintDays =
    startDate && endDate && isDateRangeValid
      ? calculateRequestedDays(startDate, endDate, isCalendar)
      : 0;

  const canSave =
    !!teamMember &&
    categoryId !== '' &&
    startDate !== undefined &&
    endDate !== undefined &&
    !!isDateRangeValid &&
    !isStartDateWeekend &&
    !isStartDateHoliday &&
    !exceedsAttritionDate &&
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
        <h3 className="text-lg font-semibold mb-4">Exception Time Off Entry</h3>
        <div className="text-center py-8 text-muted-foreground">
          Select a team member to create an exception entry.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Exception Time Off Entry</h3>
        <p className="text-sm text-muted-foreground">
          Creating entry for{' '}
          <span className="font-medium">
            {teamMember.teamMemberNames} {teamMember.teamMemberSurnames}
          </span>{' '}
          — business rules bypassed
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Category */}
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

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Start Date — allows past dates, weekends, and holidays */}
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
                      disabled={(date) => (startDate ? date < startDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Inline info + validation messages */}
        <div className="flex flex-wrap gap-4 text-sm">
          {startDate && endDate && !isDateRangeValid && (
            <p className="text-destructive">End date must be on or after start date</p>
          )}
          {isStartDateWeekend && (
            <p className="text-destructive">Start date cannot be on a weekend</p>
          )}
          {isStartDateHoliday && (
            <p className="text-destructive">Start date cannot be on a public holiday</p>
          )}
          {isFixedDuration && fixedDays && (
            <p className="text-muted-foreground">
              Fixed duration: {fixedDays} day{fixedDays !== 1 ? 's' : ''}
            </p>
          )}
          {!isFixedDuration && hintDays > 0 && (
            <p className="text-muted-foreground">
              {hintDays} day{hintDays !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {exceedsAttritionDate && teamMemberEndDate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Time off cannot extend beyond {teamMember?.teamMemberNames} {teamMember?.teamMemberSurnames}'s end date ({formatUTCDate(teamMember!.teamMemberEndDate!, 'dd-MMM-yyyy')}).
            </AlertDescription>
          </Alert>
        )}

        {/* Comment — required for audit trail */}
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
                placeholder="Reason for exception entry..."
                rows={2}
              />
            )}
          />
          {errors.comment && (
            <p className="text-sm text-destructive">{errors.comment.message}</p>
          )}
        </div>

        <Button type="submit" disabled={!canSave}>
          {loading ? 'Creating...' : 'Create Exception Entry'}
        </Button>
      </form>
    </div>
  );
}
