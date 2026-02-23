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
 * Combines what were previously two separate useEffect hooks into one, using a ref
 * to track the previous categoryId. This prevents the stale-closure bug where
 * the auto-calculation effect would fire in the same render cycle as the category
 * reset effect, reading the old startDate and producing a calculated endDate against
 * a null startDate.
 *
 * Behaviour:
 * - When categoryId changes: clears startDate and endDate, clears validation errors,
 *   and skips auto-calculation for that cycle.
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
        setValue('startDate' as any, undefined as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue('endDate' as any, undefined as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearErrors(['startDate', 'endDate'] as any);
      }

      // Return early: do not auto-calculate in the same cycle as the reset.
      // This prevents the stale-closure bug where startDate from the previous
      // render would be used to calculate an endDate after the category changed.
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
