/**
 * Time Off Day Calculation Service
 * Calculates timeOffDays based on the categoryCountryIsCalendar flag:
 * - isCalendar = true: Calendar days (all days including weekends)
 * - isCalendar = false: Workdays only (Mon-Fri)
 */

import { prisma } from '../../../db/prisma';
import { getCalculationStrategy, getCalculationType } from './strategies';
import type { DayCalculationInput, DayCalculationResult } from './types';

/**
 * Calculate time off days based on isCalendar flag
 */
export function calculateTimeOffDays(
  input: DayCalculationInput
): DayCalculationResult {
  const { startDate, endDate, isCalendar } = input;

  const strategy = getCalculationStrategy(isCalendar);
  const totalDays = strategy(startDate, endDate);

  return {
    totalDays,
    calculationType: getCalculationType(isCalendar),
  };
}

/**
 * Calculate time off days for a specific team member
 * Loads the isCalendar flag from the CategoryCountry record
 */
export async function calculateTimeOffDaysForTeamMember(
  teamMemberId: number,
  categoryId: number,
  startDate: Date,
  endDate: Date
): Promise<DayCalculationResult> {
  // Load team member's country
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { countryId: true },
  });

  // Look up CategoryCountry for isCalendar flag
  const categoryCountry = teamMember?.countryId
    ? await prisma.categoryCountry.findFirst({
        where: {
          categoryId,
          countryId: teamMember.countryId,
        },
        select: { categoryCountryIsCalendar: true },
      })
    : null;

  const isCalendar = categoryCountry?.categoryCountryIsCalendar ?? false;

  return calculateTimeOffDays({ startDate, endDate, isCalendar });
}

// Re-export types
export type { DayCalculationInput, DayCalculationResult } from './types';
