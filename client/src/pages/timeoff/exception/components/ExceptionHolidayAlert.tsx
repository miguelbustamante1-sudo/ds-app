import { useMemo } from 'react';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseUTCDateAsLocal } from '@/lib/utils';
import type { HolidayWithEffectiveDate } from '../../utils/holidayValidation';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';

interface ExceptionHolidayAlertProps {
  countryIso: string | null | undefined;
  categoryName: string | undefined;
  svHolidaysInRange: HolidayWithEffectiveDate[];
  gtWeekdayHolidaysInRange: HolidayWithEffectiveDate[];
  gtNetVacationDays: number | null;
  activeSwaps: ActiveSwapSummaryDTO[];
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export function ExceptionHolidayAlert({
  countryIso,
  categoryName,
  svHolidaysInRange,
  gtWeekdayHolidaysInRange,
  gtNetVacationDays,
  activeSwaps,
  startDate,
  endDate,
}: ExceptionHolidayAlertProps) {
  const normalizedIso = countryIso?.toUpperCase();

  const swapsInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    return activeSwaps.filter((swap) => {
      const orig = parseUTCDateAsLocal(swap.originalDate);
      const repl = parseUTCDateAsLocal(swap.replacementDate);
      const inRange = (d: Date) => d >= startDate && d <= endDate;
      return inRange(orig) || inRange(repl);
    });
  }, [activeSwaps, startDate, endDate]);

  const hasSVHolidays = normalizedIso === 'SV' && svHolidaysInRange.length > 0;
  const hasGTHolidays =
    normalizedIso === 'GT' &&
    categoryName?.toLowerCase() === 'vacation' &&
    gtWeekdayHolidaysInRange.length > 0 &&
    gtNetVacationDays !== null;
  const hasSwaps = swapsInRange.length > 0;

  if (!hasSVHolidays && !hasGTHolidays && !hasSwaps) return null;

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        {hasSVHolidays && (
          <div>
            <p className="font-medium mb-1">
              The following public holiday(s) fall within this range and count as vacation days:
            </p>
            <ul className="list-disc list-inside text-sm">
              {svHolidaysInRange.map(({ holiday, effectiveDate }) => (
                <li key={holiday.holidayId}>
                  {holiday.holidayName} — {format(effectiveDate, 'dd-MMM-yyyy')}
                  {holiday.holidayIsHalfDay && ' (half day)'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasGTHolidays && (
          <div>
            <p className="font-medium mb-1">
              The following weekday holiday(s) fall within this range and are NOT counted as vacation days:
            </p>
            <ul className="list-disc list-inside text-sm mb-2">
              {gtWeekdayHolidaysInRange.map(({ holiday, effectiveDate }) => (
                <li key={holiday.holidayId}>
                  {holiday.holidayName} — {format(effectiveDate, 'dd-MMM-yyyy')}
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium">
              Net vacation days: <strong>{gtNetVacationDays} day{gtNetVacationDays !== 1 ? 's' : ''}</strong>
            </p>
          </div>
        )}

        {hasSwaps && (
          <div>
            <p className="font-medium mb-1">Active holiday swap(s) affecting this range:</p>
            <ul className="list-disc list-inside text-sm">
              {swapsInRange.map((swap) => (
                <li key={swap.holidaySwapId}>
                  {swap.holidayName}: moved from{' '}
                  {format(parseUTCDateAsLocal(swap.originalDate), 'dd-MMM-yyyy')} →{' '}
                  {format(parseUTCDateAsLocal(swap.replacementDate), 'dd-MMM-yyyy')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
