/**
 * Strategy factory for day calculation
 */

import { calculateWorkdays } from './workdays';
import { calculateCalendarDays } from './calendar';
import type { DayCalculationStrategy } from '../types';

export function getCalculationStrategy(isCalendar: boolean): DayCalculationStrategy {
  return isCalendar ? calculateCalendarDays : calculateWorkdays;
}

export function getCalculationType(isCalendar: boolean): 'workdays' | 'calendar' {
  return isCalendar ? 'calendar' : 'workdays';
}

export { calculateWorkdays } from './workdays';
export { calculateCalendarDays } from './calendar';
