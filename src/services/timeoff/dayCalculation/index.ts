/**
 * Time Off Day Calculation Service
 * Calculates timeOffDays based on country-specific rules:
 * - Guatemala (GT): Workdays only (Mon-Fri)
 * - El Salvador (SV) and default: Calendar days (all days)
 */

import { prisma } from '../../../db/prisma';
import { getCalculationStrategy, getCalculationType } from './strategies';
import type { DayCalculationInput, DayCalculationResult } from './types';
import { COUNTRY_ISO } from './types';

/**
 * Calculate time off days based on country ISO code
 */
export function calculateTimeOffDays(
  input: DayCalculationInput
): DayCalculationResult {
  const { startDate, endDate, countryIso } = input;

  // Normalize country ISO, default to SV behavior
  const normalizedIso = countryIso?.toUpperCase() ?? COUNTRY_ISO.EL_SALVADOR;

  // Get the appropriate strategy
  const strategy = getCalculationStrategy(normalizedIso);
  const totalDays = strategy(startDate, endDate);

  return {
    totalDays,
    countryIso: normalizedIso,
    calculationType: getCalculationType(normalizedIso),
  };
}

/**
 * Calculate time off days for a specific team member
 * Loads country from database
 */
export async function calculateTimeOffDaysForTeamMember(
  teamMemberId: number,
  startDate: Date,
  endDate: Date
): Promise<DayCalculationResult> {
  // Load team member's country
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: {
      country: {
        select: { countryIso: true },
      },
    },
  });

  const countryIso = teamMember?.country?.countryIso ?? null;

  return calculateTimeOffDays({
    startDate,
    endDate,
    countryIso,
  });
}

// Re-export types and constants
export type { DayCalculationInput, DayCalculationResult } from './types';
export { COUNTRY_ISO } from './types';
