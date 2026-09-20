/**
 * Time Off Day Calculation Service
 * Calculates timeOffDays using the unified calculateDays engine, driven by two
 * independent per-category-per-country flags:
 * - categoryCountryIsCalendar ("count weekends"): counts Sat/Sun as chargeable.
 * - categoryCountryCountHolidays: counts holidays as chargeable.
 */

import { prisma } from '../../../db/prisma';
import { calculateDays } from './strategies/calculateDays';
import { loadHolidaysForCalc } from './components/LoadHolidaysForCalc';
import type { DayCalculationResult } from './types';

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

  const categoryCountry = teamMember?.countryId
    ? await prisma.categoryCountry.findFirst({
        where: {
          categoryId,
          countryId: teamMember.countryId,
        },
        select: {
          categoryCountryIsCalendar: true,
          categoryCountryCountHolidays: true,
        },
      })
    : null;

  const countWeekends = categoryCountry?.categoryCountryIsCalendar ?? false;
  const countHolidays = categoryCountry?.categoryCountryCountHolidays ?? false;

  const holidays = teamMember?.countryId
    ? await loadHolidaysForCalc(teamMemberId, teamMember.countryId, startDate, endDate)
    : [];

  const totalDays = calculateDays(startDate, endDate, {
    countWeekends,
    countHolidays,
    holidays,
  });

  return {
    totalDays,
    calculationType: countWeekends ? 'calendar' : 'workdays',
  };
}

// Re-export types
export type { DayCalculationResult } from './types';
