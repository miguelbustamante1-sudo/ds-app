import { useState, useCallback } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { calculateCalendarDays } from '../utils/elSalvadorVacationValidation';
import { useHolidayAwareness } from '../hooks/useHolidayAwareness';
import { useHolidayContext } from '../context/HolidayContext';

export interface SplitPeriod {
  startDate: Date;
  endDate: Date;
}

interface SVVacationSplitModeProps {
  anchorStartDate: Date;
  countryIso: string | null;
  userEndDate: Date | null;
  /** The shared comment from the main form — used to gate the Save Split button. */
  comment: string;
  submitting: boolean;
  onBack: () => void;
  onSaveSplit: (periodA: SplitPeriod, periodB: SplitPeriod) => void;
  /** 'stacked' (default) — periods shown vertically; 'columns' — periods side by side */
  layout?: 'stacked' | 'columns';
}

export function SVVacationSplitMode({
  anchorStartDate,
  countryIso,
  userEndDate,
  comment,
  submitting,
  onBack,
  onSaveSplit,
  layout = 'stacked',
}: SVVacationSplitModeProps) {
  const [periodAEndDate, setPeriodAEndDate] = useState<Date | undefined>(undefined);
  const [periodADays, setPeriodADays] = useState<number>(0);
  const [periodAError, setPeriodAError] = useState<string | null>(null);
  const [periodBStartDate, setPeriodBStartDate] = useState<Date | undefined>(undefined);
  const [periodBEndDate, setPeriodBEndDate] = useState<Date | undefined>(undefined);

  // Shared holiday context — both periods are in the same country.
  const { isHoliday } = useHolidayContext();

  // When Period A = 7 days, Period B must be 8 (and vice versa)
  const periodBRequiredDays = periodADays === 7 ? 8 : periodADays === 8 ? 7 : 0;

  // Holiday awareness for Period A
  const periodAHolidays = useHolidayAwareness({
    countryIso,
    startDate: anchorStartDate,
    endDate: periodAEndDate,
    isCalendar: true,
  });

  // Holiday awareness for Period B (same country, different date range)
  const periodBHolidays = useHolidayAwareness({
    countryIso,
    startDate: periodBStartDate,
    endDate: periodBEndDate,
    isCalendar: true,
  });

  const handlePeriodAEndDateSelect = useCallback(
    (date: Date | undefined) => {
      setPeriodAError(null);
      // Reset Period B whenever Period A changes
      setPeriodBStartDate(undefined);
      setPeriodBEndDate(undefined);

      if (!date) {
        setPeriodAEndDate(undefined);
        setPeriodADays(0);
        return;
      }

      const days = calculateCalendarDays(anchorStartDate, date);
      setPeriodAEndDate(date);
      setPeriodADays(days);

      if (days !== 7 && days !== 8) {
        setPeriodAError('The first period must be exactly 7 or 8 calendar days.');
      }
    },
    [anchorStartDate],
  );

  const handlePeriodBStartDateSelect = useCallback(
    (date: Date | undefined) => {
      setPeriodBStartDate(date);
      if (!date || periodBRequiredDays === 0) {
        setPeriodBEndDate(undefined);
        return;
      }
      // Auto-calculate Period B end date (e.g. 8 days inclusive = start + 7)
      setPeriodBEndDate(addDays(date, periodBRequiredDays - 1));
    },
    [periodBRequiredDays],
  );

  const isPeriodAValid = !!periodAEndDate && !periodAError && periodADays > 0;
  const isPeriodBValid = !!periodBStartDate && !!periodBEndDate;
  const canSaveSplit = isPeriodAValid && isPeriodBValid && !!comment.trim() && !submitting;

  const handleSaveSplit = useCallback(() => {
    if (!periodAEndDate || !periodBStartDate || !periodBEndDate) return;
    onSaveSplit(
      { startDate: anchorStartDate, endDate: periodAEndDate },
      { startDate: periodBStartDate, endDate: periodBEndDate },
    );
  }, [anchorStartDate, periodAEndDate, periodBStartDate, periodBEndDate, onSaveSplit]);

  const isColumns = layout === 'columns';

  const period1Card = (
    <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Period 1</h4>
          {isPeriodAValid && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
              {periodADays} calendar days
            </span>
          )}
        </div>

        {/* Period A Start — locked to anchor */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Start Date (locked)</Label>
          <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm items-center text-muted-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(anchorStartDate, 'PPP')}
          </div>
        </div>

        {/* Period A End — user picks; must yield 7 or 8 days */}
        <div className="space-y-1">
          <Label className="text-xs">
            End Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !periodAEndDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodAEndDate ? format(periodAEndDate, 'PPP') : 'Pick end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodAEndDate}
                onSelect={handlePeriodAEndDateSelect}
                defaultMonth={periodAEndDate ?? anchorStartDate}
                disabled={(date) => {
                  if (date < anchorStartDate) return true;
                  if (userEndDate && date > userEndDate) return true;
                  if (isHoliday(date)) return true;
                  return false;
                }}
                modifiers={{ holiday: periodAHolidays.holidayDatesForCalendar }}
                modifiersClassNames={{ holiday: 'bg-amber-100 text-amber-800 font-medium' }}
              />
            </PopoverContent>
          </Popover>
          {periodAError && <p className="text-sm text-destructive">{periodAError}</p>}
        </div>

        {/* Period A holiday notice */}
        {periodAHolidays.svHolidaysInRange.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm font-medium mb-1">
                Holidays in Period 1 (counted as vacation days):
              </p>
              <ul className="list-disc list-inside text-sm">
                {periodAHolidays.svHolidaysInRange.map(({ holiday, effectiveDate }) => (
                  <li key={holiday.holidayId}>
                    {holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}
                    {holiday.holidayIsHalfDay && ' (half day)'}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
  );

  const period2Card = (
      <div className={cn('border rounded-lg p-4 space-y-3', !isPeriodAValid && 'opacity-50')}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Period 2</h4>
          {isPeriodBValid && periodBRequiredDays > 0 && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
              {periodBRequiredDays} calendar days
            </span>
          )}
        </div>

        {/* Period B Start — user picks; must be after Period A end */}
        <div className="space-y-1">
          <Label className="text-xs">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                disabled={!isPeriodAValid}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !periodBStartDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodBStartDate ? format(periodBStartDate, 'PPP') : 'Pick start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodBStartDate}
                onSelect={handlePeriodBStartDateSelect}
                defaultMonth={
                  periodBStartDate ??
                  (periodAEndDate ? addDays(periodAEndDate, 1) : startOfDay(new Date()))
                }
                disabled={(date) => {
                  if (!periodAEndDate) return true;
                  if (date <= periodAEndDate) return true;
                  if (userEndDate && date > userEndDate) return true;
                  if (isHoliday(date)) return true;
                  return false;
                }}
                modifiers={{ holiday: periodBHolidays.holidayDatesForCalendar }}
                modifiersClassNames={{ holiday: 'bg-amber-100 text-amber-800 font-medium' }}
              />
            </PopoverContent>
          </Popover>
          {isPeriodAValid && (
            <p className="text-xs text-muted-foreground">
              Must start after {periodAEndDate ? format(periodAEndDate, 'MMM d, yyyy') : '—'}. A gap between periods is allowed.
            </p>
          )}
        </div>

        {/* Period B End — auto-calculated, readonly */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">End Date (auto-calculated)</Label>
          <div
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm items-center',
              !periodBEndDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {periodBEndDate ? format(periodBEndDate, 'PPP') : 'Will be set automatically'}
          </div>
          {isPeriodAValid && (
            <p className="text-xs text-muted-foreground">
              Period 2 is always {periodBRequiredDays} calendar days.
            </p>
          )}
        </div>

        {/* Period B holiday notice */}
        {periodBHolidays.svHolidaysInRange.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm font-medium mb-1">
                Holidays in Period 2 (counted as vacation days):
              </p>
              <ul className="list-disc list-inside text-sm">
                {periodBHolidays.svHolidaysInRange.map(({ holiday, effectiveDate }) => (
                  <li key={holiday.holidayId}>
                    {holiday.holidayName} — {format(effectiveDate, 'MMM d, yyyy')}
                    {holiday.holidayIsHalfDay && ' (half day)'}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Back to single request — stacked mode only; columns mode uses banner in parent */}
      {!isColumns && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to single request
        </button>
      )}

      {isColumns ? (
        <div className="grid grid-cols-2 gap-6">
          {period1Card}
          {period2Card}
        </div>
      ) : (
        <>
          {period1Card}
          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground font-medium px-1">PERIOD 2</span>
            <div className="flex-1 border-t" />
          </div>
          {period2Card}
        </>
      )}

      {/* Save Split button */}
      <Button type="button" className="w-full" disabled={!canSaveSplit} onClick={handleSaveSplit}>
        {submitting ? 'Saving...' : 'Save Split'}
      </Button>
    </div>
  );
}
