import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormSetValue, UseFormClearErrors } from 'react-hook-form';
import { calculateFixedDurationEndDate } from '../pages/timeoff/utils/fixedDurationEndDate';

interface UseTimeOffFormDatesParams<TFields extends FieldValues> {
  categoryId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  isFixedDuration: boolean;
  fixedDays: number | null;
  isCalendar: boolean;
  setValue: UseFormSetValue<TFields>;
  clearErrors: UseFormClearErrors<TFields>;
}

/**
 * Manages the date reset and auto-calculation side effects for time-off request forms.
 *
 * Uses a ref to track the previous categoryId so category changes can be detected.
 *
 * Behaviour:
 * - When categoryId changes: clears only endDate and validation errors, keeps startDate.
 *   If the new category is fixed-duration and a startDate exists, calculates endDate immediately.
 * - When startDate changes (same categoryId) and the category is fixed-duration:
 *   calculates and sets the endDate automatically.
 */
export function useTimeOffFormDates<TFields extends FieldValues>({
  categoryId,
  startDate,
  endDate,
  isFixedDuration,
  fixedDays,
  isCalendar,
  setValue,
  clearErrors,
}: UseTimeOffFormDatesParams<TFields>): void {
  const prevCategoryIdRef = useRef<string>(categoryId);

  useEffect(() => {
    const prevCategoryId = prevCategoryIdRef.current;

    if (categoryId !== prevCategoryId) {
      prevCategoryIdRef.current = categoryId;

      if (categoryId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue('endDate' as any, undefined as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearErrors(['startDate', 'endDate'] as any);
      }

      // If the new category is fixed-duration and we have a startDate, calculate
      // the endDate immediately in the same cycle.
      if (isFixedDuration && fixedDays && startDate) {
        const calculatedEndDate = calculateFixedDurationEndDate(startDate, fixedDays, isCalendar);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue('endDate' as any, calculatedEndDate as any);
      }

      return;
    }

    if (isFixedDuration && fixedDays && startDate) {
      const calculatedEndDate = calculateFixedDurationEndDate(startDate, fixedDays, isCalendar);
      if (!endDate || endDate.getTime() !== calculatedEndDate.getTime()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue('endDate' as any, calculatedEndDate as any);
      }
    }
  }, [categoryId, startDate, endDate, isFixedDuration, fixedDays, isCalendar, setValue, clearErrors]);
}
