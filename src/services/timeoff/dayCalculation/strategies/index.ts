/**
 * Strategy factory for day calculation
 */

import { calculateWorkdays } from './workdays';
import { calculateCalendarDays } from './calendar';
import { COUNTRY_ISO, type DayCalculationStrategy } from '../types';

export function getCalculationStrategy(
  countryIso: string | null
): DayCalculationStrategy {
  const normalizedIso = countryIso?.toUpperCase() ?? null;

  switch (normalizedIso) {
    case COUNTRY_ISO.GUATEMALA:
      return calculateWorkdays;
    case COUNTRY_ISO.EL_SALVADOR:
    default:
      return calculateCalendarDays;
  }
}

export function getCalculationType(
  countryIso: string | null
): 'workdays' | 'calendar' {
  const normalizedIso = countryIso?.toUpperCase() ?? null;
  return normalizedIso === COUNTRY_ISO.GUATEMALA ? 'workdays' : 'calendar';
}

export { calculateWorkdays } from './workdays';
export { calculateCalendarDays } from './calendar';
